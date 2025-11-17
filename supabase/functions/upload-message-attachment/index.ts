import { createClient } from "npm:@supabase/supabase-js@2.43.4";
// Using Deno.serve per guidelines
console.info('upload-message-attachment function starting');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ATTACHMENT_BUCKET = Deno.env.get('ATTACHMENT_BUCKET') ?? 'message-attachments';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
// Expanded MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain'
]);
const MAX_SIZE_BYTES = Deno.env.get('ATTACHMENT_MAX_BYTES') ? Number(Deno.env.get('ATTACHMENT_MAX_BYTES')) : 5 * 1024 * 1024;
const respond = (status, body)=>new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
const stripDataUrlPrefix = (s)=>{
  if (typeof s !== 'string') return s;
  const idx = s.indexOf('base64,');
  if (idx !== -1) return s.slice(idx + 7);
  return s;
};
const decodeBase64 = (base64)=>{
  try {
    const cleaned = stripDataUrlPrefix(base64);
    return Uint8Array.from(atob(cleaned), (c)=>c.charCodeAt(0));
  } catch (error) {
    throw new Error(`Failed to decode base64 payload: ${error?.message ?? error}`);
  }
};
const ensureUserInConversation = async (conversationId, userId)=>{
  const { data, error } = await supabase.from('conversations').select('participant_1, participant_2').eq('id', conversationId).single();
  if (error || !data) {
    throw new Error('Conversation not found or access denied.');
  }
  const participants = [
    data.participant_1,
    data.participant_2
  ].map(String);
  if (!participants.includes(String(userId))) {
    throw new Error('You are not a participant in this conversation.');
  }
  return data;
};
const validatePayload = (payload)=>{
  if (!payload?.conversationId) throw new Error('Conversation ID is required.');
  if (!payload?.fileName) throw new Error('File name is required.');
  if (!payload?.mimeType) throw new Error('Mime type is required.');
  if (!ALLOWED_MIME_TYPES.has(payload.mimeType)) throw new Error(`Unsupported file type: ${payload.mimeType}`);
  if (!payload?.size || payload.size <= 0 || payload.size > MAX_SIZE_BYTES) throw new Error(`Attachment exceeds the allowed size limit (${MAX_SIZE_BYTES} bytes).`);
  if (!payload?.base64) throw new Error('Attachment content is missing.');
};
Deno.serve(async (req)=>{
  try {
    const start = Date.now();
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return respond(401, {
      error: 'Missing bearer token.'
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return respond(401, {
      error: 'Invalid or expired token.'
    });
    const payload = await req.json();
    validatePayload(payload);
    await ensureUserInConversation(payload.conversationId, user.id);
    // decode
    const fileBuffer = decodeBase64(payload.base64);
    const filePath = `${payload.conversationId}/${Date.now()}-${payload.fileName}`;
    console.info('Uploading to bucket', ATTACHMENT_BUCKET, 'path', filePath, 'mime', payload.mimeType, 'size', payload.size, 'user', user.id);
    const { error: uploadError, data: uploadData } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(filePath, fileBuffer, {
      contentType: payload.mimeType,
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) throw uploadError;
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(filePath, 60 * 60);
    if (signedUrlError) throw signedUrlError;
    // persist audit row but return error details if it fails (logged)
    const { error: auditError } = await supabase.from('message_attachment_audit').insert({
      conversation_id: payload.conversationId,
      user_id: user.id,
      file_path: filePath,
      mime_type: payload.mimeType,
      file_size: payload.size
    });
    if (auditError) console.warn('Attachment audit insert failed:', JSON.stringify(auditError));
    
    
    
    const duration = Date.now() - start;
    console.info('upload-message-attachment success', {
      filePath,
      bucket: ATTACHMENT_BUCKET,
      duration
    });
    return respond(200, {
      success: true,
      attachment: {
        storagePath: filePath,
        signedUrl: signedUrlData?.signedUrl ?? null,
        mimeType: payload.mimeType,
        size: payload.size
      }
    });
  } catch (error) {
    console.error('upload-message-attachment error:', error);
    // Return richer error details but avoid leaking secrets
    return respond(400, {
      success: false,
      error: error?.message ?? 'Upload failed',
      debug: error?.response?.message ? error.response.message : undefined
    });
  }
});
