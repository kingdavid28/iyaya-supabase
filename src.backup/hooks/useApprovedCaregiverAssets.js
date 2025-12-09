import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { usePrivacy } from '../components/features/privacy/PrivacyManager';
import { QUERY_KEYS } from './useParentDashboard';

const isMediaAsset = (document) => {
    if (!document) return false;

    const type = String(document.type || '').toLowerCase();
    const fileName = String(document.fileName || document.label || '').toLowerCase();

    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.heic', '.heif'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

    const hasImageExtension = imageExtensions.some((ext) => fileName.endsWith(ext));
    const hasVideoExtension = videoExtensions.some((ext) => fileName.endsWith(ext));

    if (type.includes('image')) return true;
    if (type.includes('video')) return true;
    if (hasImageExtension || hasVideoExtension) return true;

    return false;
};

const normalizeDocuments = (documents = []) => {
    if (!Array.isArray(documents)) {
        return [];
    }

    return documents.map((document) => ({
        id: document.id || document.url,
        label: document.label || document.fileName || document.name || 'Document',
        type: document.type || document.documentType || null,
        fileName: document.fileName || document.label || null,
        url: document.url || null,
        uploadedAt: document.uploadedAt || null,
        verified: Boolean(document.verified),
        metadata: document.metadata || null,
    }));
};

const sanitizeFileName = (fileName = 'document') => {
    const fallback = 'shared-document';
    const trimmed = String(fileName).trim();
    if (!trimmed) return fallback;
    return trimmed.replace(/[^a-z0-9_.-]+/gi, '_');
};

const ensureUrlAccessible = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const headResponse = await fetch(url, { method: 'HEAD', signal: controller.signal });
        if (headResponse.ok) {
            return;
        }

        if (headResponse.status === 401 || headResponse.status === 403) {
            throw new Error('This link has expired. Please request access again.');
        }

        if (!headResponse.ok) {
            throw new Error('Unable to access document. Please try again later.');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Network timeout while validating the document link.');
        }
        if (error.message?.toLowerCase().includes('expired')) {
            throw error;
        }

        // Some storage providers reject HEAD requests – fall back to a tiny GET.
        try {
            const rangeResponse = await fetch(url, {
                method: 'GET',
                headers: { Range: 'bytes=0-0' },
            });

            if (rangeResponse.status === 401 || rangeResponse.status === 403) {
                throw new Error('This link has expired. Please request access again.');
            }

            if (!rangeResponse.ok) {
                throw new Error('Unable to access document. Please try again later.');
            }
        } catch (secondaryError) {
            if (secondaryError.name === 'AbortError') {
                throw new Error('Network timeout while validating the document link.');
            }
            throw secondaryError;
        }
    } finally {
        clearTimeout(timeout);
    }
};

export const useApprovedCaregiverAssets = ({ caregiverId, viewerId, enabled = true } = {}) => {
    const { getSharedProfileForViewer } = usePrivacy();
    const queryClient = useQueryClient();
    const [downloadingId, setDownloadingId] = useState(null);
    const [downloadError, setDownloadError] = useState(null);

    const isEnabled = Boolean(enabled && caregiverId && viewerId);
    const queryKey = QUERY_KEYS.caregiverAssets(viewerId || 'anonymous', caregiverId || 'unknown');

    const queryFn = useCallback(async () => {
        if (!isEnabled) {
            return null;
        }

        const response = await getSharedProfileForViewer(caregiverId, viewerId, {
            includeExpired: false,
            includeRaw: false,
        });

        if (!response) {
            return {
                documents: [],
                media: [],
                profile: {},
                shared: {},
                permissions: {},
            };
        }

        const normalizedDocuments = normalizeDocuments(response.documents);
        const media = normalizedDocuments.filter(isMediaAsset);
        const mediaIds = new Set(media.map((item) => item.id));
        const documents = normalizedDocuments.filter((item) => !mediaIds.has(item.id));

        return {
            documents,
            media,
            profile: response.profile || {},
            shared: response.shared || {},
            permissions: response.permissions || {},
        };
    }, [isEnabled, getSharedProfileForViewer, caregiverId, viewerId]);

    const query = useQuery({
        queryKey,
        queryFn,
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
    });

    const refresh = useCallback(async () => {
        if (!isEnabled) {
            return;
        }

        await queryClient.invalidateQueries({ queryKey });
    }, [isEnabled, queryClient, queryKey]);

    const downloadDocument = useCallback(
        async (document) => {
            if (!document?.url) {
                const error = new Error('Document URL is unavailable. Please request access again.');
                setDownloadError(error);
                throw error;
            }

            setDownloadError(null);
            setDownloadingId(document.id || document.url);

            try {
                await ensureUrlAccessible(document.url);

                if (Platform.OS === 'web') {
                    window.open(document.url, '_blank', 'noopener,noreferrer');
                    return { platform: 'web', shared: false };
                }

                const fileName = sanitizeFileName(document.fileName || document.label || 'document');
                const extension = document.fileName?.split('.').pop() || document.type?.split('/').pop() || 'pdf';
                const targetUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${fileName}.${extension}`;

                const downloadResult = await FileSystem.downloadAsync(document.url, targetUri);

                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(downloadResult.uri);
                    return { platform: Platform.OS, uri: downloadResult.uri, shared: true };
                }

                return {
                    platform: Platform.OS,
                    uri: downloadResult.uri,
                    shared: false,
                    message: 'File downloaded locally. Sharing is not available on this device.',
                };
            } catch (error) {
                const normalizedError = error instanceof Error ? error : new Error(String(error));
                setDownloadError(normalizedError);
                throw normalizedError;
            } finally {
                setDownloadingId(null);
            }
        },
        []
    );

    const value = useMemo(() => {
        const data = query.data || {
            documents: [],
            media: [],
            profile: {},
            shared: {},
            permissions: {},
        };

        return {
            ...data,
            loading: query.isLoading,
            refreshing: query.isFetching,
            error: query.error,
            refresh,
            downloadDocument,
            downloadingId,
            downloadError,
            isDownloadInProgress: Boolean(downloadingId),
        };
    }, [query.data, query.error, query.isFetching, query.isLoading, refresh, downloadDocument, downloadingId, downloadError]);

    return value;
};

export default useApprovedCaregiverAssets;