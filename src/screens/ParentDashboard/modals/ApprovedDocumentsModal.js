import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import {
    AlertCircle,
    Download,
    ExternalLink,
    FileText,
    Maximize2,
    RefreshCcw,
    ShieldCheck,
    X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

import { privacyAPI } from '../../../config/api';
import {
    DOCUMENT_TYPE_LABELS,
    formatDateDisplay,
    normalizeDocumentEntry,
    normalizePortfolio,
} from '../../../utils/profileAssets';

const CATEGORIES = {
    DOCUMENTS: 'documents',
    IMAGES: 'images',
    BACKGROUND: 'background',
};

const SKELETON_ROWS = Array.from({ length: 3 }).map((_, index) => ({
    id: `skeleton-${index}`,
}));

const getDocumentCategory = (document) => {
    const type = String(
        document?.type ||
        document?.category ||
        document?.metadata?.category ||
        document?.source?.category ||
        '',
    ).toLowerCase();
    const filename = String(document?.fileName || document?.label || document?.name || '').toLowerCase();

    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.heic', '.heif'];
    const isImage = type.includes('image') || imageExtensions.some((ext) => filename.endsWith(ext));

    if (type.includes('background') || filename.includes('background')) {
        return CATEGORIES.BACKGROUND;
    }

    if (isImage) {
        return CATEGORIES.IMAGES;
    }

    return CATEGORIES.DOCUMENTS;
};

const sanitizeFileName = (fileName = 'document') => {
    const trimmed = String(fileName || '').trim();
    if (!trimmed) {
        return 'shared-document';
    }
    return trimmed.replace(/[^a-z0-9_.-]+/gi, '_');
};

const getFileExtension = (document) => {
    const fromFileName = String(document?.fileName || '').split('.');
    if (fromFileName.length > 1) {
        return fromFileName.pop();
    }

    const type = String(document?.type || '').toLowerCase();
    if (type.includes('/')) {
        return type.split('/').pop();
    }

    return 'pdf';
};

const guessMimeType = (document, extension = null) => {
    if (document?.mimeType) {
        return document.mimeType;
    }

    const type = String(document?.type || '').toLowerCase();
    if (type.includes('/')) {
        return document.type;
    }

    const ext = String(extension || getFileExtension(document) || '').toLowerCase();
    switch (ext) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'gif':
            return 'image/gif';
        case 'bmp':
            return 'image/bmp';
        case 'webp':
            return 'image/webp';
        case 'heic':
        case 'heif':
            return 'image/heic';
        case 'pdf':
            return 'application/pdf';
        case 'doc':
            return 'application/msword';
        case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'xls':
            return 'application/vnd.ms-excel';
        case 'xlsx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'ppt':
            return 'application/vnd.ms-powerpoint';
        case 'pptx':
            return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        case 'csv':
            return 'text/csv';
        case 'txt':
            return 'text/plain';
        default:
            return 'application/octet-stream';
    }
};

const withDownloadDisposition = (url, fileName = 'document') => {
    if (typeof url !== 'string' || !url.length) {
        return url;
    }

    const safeName = sanitizeFileName(fileName) || 'shared-document';

    try {
        const parsed = new URL(url);

        if (!parsed.searchParams.has('download')) {
            parsed.searchParams.set('download', safeName);
        }

        if (!parsed.searchParams.has('response-content-disposition')) {
            parsed.searchParams.set('response-content-disposition', `attachment; filename="${safeName}"`);
        }

        return parsed.toString();
    } catch (parseError) {
        const attachmentParam = `download=${encodeURIComponent(safeName)}`;
        const dispositionParam = `response-content-disposition=${encodeURIComponent(`attachment; filename="${safeName}"`)}`;
        const separator = url.includes('?') ? '&' : '?';
        const existingParams = [];

        if (url.includes('download=')) {
            existingParams.push(attachmentParam);
        }

        if (url.includes('response-content-disposition=')) {
            existingParams.push(dispositionParam);
        }

        const paramsToAppend = [attachmentParam, dispositionParam].filter((param) => !existingParams.includes(param));
        if (!paramsToAppend.length) {
            return url;
        }

        return `${url}${separator}${paramsToAppend.join('&')}`;
    }
};

const openAndroidDocument = async (uri, mimeType) => {
    try {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: mimeType || '*/*',
        });
        return true;
    } catch (androidError) {
        console.warn('Failed to launch Android intent for document', androidError);
        return false;
    }
};

const hasBackgroundCategory = (documents, sharedMeta) => {
    if (sharedMeta?.backgroundCheckStatus) {
        return true;
    }

    return documents.some((doc) => getDocumentCategory(doc) === CATEGORIES.BACKGROUND);
};

const SkeletonTile = () => (
    <View style={styles.tileContainer}>
        <View style={[styles.tilePreview, styles.skeletonBlock]} />
        <View style={styles.tileContent}>
            <View style={[styles.skeletonLine, { width: '75%' }]} />
            <View style={[styles.skeletonLine, { width: '55%' }]} />
            <View style={[styles.skeletonLine, { width: '40%' }]} />
            <View style={[styles.skeletonLine, { width: '60%', height: 28, marginTop: 16 }]} />
        </View>
    </View>
);

const DocumentTile = ({ document, onDownload, onOpenInNewTab, isDownloading, onPreview }) => {
    const category = getDocumentCategory(document);
    const isImagePreview = category === CATEGORIES.IMAGES && document?.url;
    const uploadedRaw = document?.uploadedAtRaw || document?.createdAt || document?.created_at;
    const fallbackDate = uploadedRaw ? new Date(uploadedRaw) : null;
    const fallbackDateDisplay = fallbackDate && !Number.isNaN(fallbackDate.getTime())
        ? fallbackDate.toLocaleDateString()
        : null;
    const uploadedDisplay = typeof document?.uploadedAt === 'string' && document.uploadedAt.trim().length > 0
        ? document.uploadedAt
        : formatDateDisplay(uploadedRaw) || fallbackDateDisplay;
    const uploadedLabel = uploadedDisplay
        ? `Uploaded ${uploadedDisplay}`
        : 'Upload date unavailable';

    return (
        <View style={styles.tileContainer}>
            {isImagePreview ? (
                <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    style={styles.tilePreview}
                    onPress={() => onPreview?.(document)}
                >
                    <Image source={{ uri: document.url }} style={styles.tileImage} resizeMode="cover" />
                    <View style={styles.tilePreviewOverlay} pointerEvents="none">
                        <Maximize2 size={16} color="#1d4ed8" />
                        <Text style={styles.tilePreviewOverlayText}>Preview</Text>
                    </View>
                </TouchableOpacity>
            ) : (
                <View style={styles.tilePreview}>
                    <View style={styles.tileIconWrapper}>
                        <FileText size={22} color="#4338ca" />
                    </View>
                </View>
            )}

            <View style={styles.tileContent}>
                <View style={styles.tileHeader}>
                    <Text style={styles.tileTitle} numberOfLines={1}>
                        {document?.label || document?.title || document?.fileName || 'Shared document'}
                    </Text>
                    {document?.verified && (
                        <View style={styles.verifiedBadge}>
                            <ShieldCheck size={14} color="#15803d" />
                            <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.tileMeta} numberOfLines={2}>
                    {document?.typeLabel
                        || DOCUMENT_TYPE_LABELS[document?.type]
                        || document?.type
                        || document?.category
                        || 'Document'}
                </Text>
                <Text style={styles.tileMetaSecondary}>{uploadedLabel}</Text>

                <View style={styles.tileActions}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
                        onPress={() => onDownload(document)}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Download size={16} color="#fff" />
                                <Text style={styles.downloadButtonText}>Download</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {Platform.OS === 'web' && document?.url ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            style={styles.openButton}
                            onPress={() => onOpenInNewTab?.(document)}
                            disabled={isDownloading}
                        >
                            <ExternalLink size={16} color="#2563eb" />
                            <Text style={styles.openButtonText}>Open in new tab</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        </View>
    );
};

const ApprovedDocumentsModal = ({ visible, onClose, caregiver = {}, viewerId = null }) => {
    const caregiverId = caregiver?.id || caregiver?.userId;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sharedPayload, setSharedPayload] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES.DOCUMENTS);
    const [downloadingId, setDownloadingId] = useState(null);
    const [previewDocument, setPreviewDocument] = useState(null);

    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const previewImageStyle = useMemo(
        () => ({
            maxWidth: Math.min(screenWidth - 48, 640),
            maxHeight: screenHeight * 0.75,
        }),
        [screenHeight, screenWidth],
    );

    const documents = useMemo(() => sharedPayload?.documents || [], [sharedPayload]);

    const portfolio = useMemo(
        () => sharedPayload?.shared?.portfolio || { images: [], videos: [] },
        [sharedPayload],
    );

    const hasPortfolioMedia = useMemo(
        () => (portfolio?.images?.length || 0) > 0 || (portfolio?.videos?.length || 0) > 0,
        [portfolio],
    );

    const backgroundInfo = sharedPayload?.shared || {};

    const categoryOptions = useMemo(() => {
        const hasDocuments = documents.some((doc) => getDocumentCategory(doc) === CATEGORIES.DOCUMENTS);
        const hasImages = documents.some((doc) => getDocumentCategory(doc) === CATEGORIES.IMAGES);
        const hasBackground = hasBackgroundCategory(documents, backgroundInfo);

        const options = [];
        if (hasDocuments) options.push({ key: CATEGORIES.DOCUMENTS, label: 'Documents' });
        if (hasImages) options.push({ key: CATEGORIES.IMAGES, label: 'Images' });
        if (hasBackground) options.push({ key: CATEGORIES.BACKGROUND, label: 'Background Check' });

        if (!options.length) {
            options.push({ key: CATEGORIES.DOCUMENTS, label: 'Documents' });
        }

        return options;
    }, [documents, backgroundInfo]);

    const fetchSharedData = useCallback(async () => {
        if (!caregiverId) {
            setSharedPayload(null);
            setError('Caregiver reference missing. Please try again later.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await privacyAPI.getSharedCaregiverData(caregiverId, viewerId, { includeExpired: false });

            if (!response) {
                setSharedPayload({
                    documents: [],
                    shared: { portfolio: normalizePortfolio(null) },
                });
                return;
            }

            const normalizedDocuments = Array.isArray(response.documents)
                ? response.documents
                    .map((doc, index) => normalizeDocumentEntry(doc, index))
                    .filter(Boolean)
                : [];

            const normalizedShared = {
                ...(response.shared || {}),
                portfolio: normalizePortfolio(response.shared?.portfolio),
            };

            setSharedPayload({
                ...response,
                documents: normalizedDocuments,
                shared: normalizedShared,
            });
        } catch (fetchError) {
            console.error('Failed to load shared caregiver documents', fetchError);
            setError(fetchError?.message || 'Failed to load shared documents.');
        } finally {
            setLoading(false);
        }
    }, [caregiverId, viewerId]);

    useEffect(() => {
        if (visible) {
            fetchSharedData();
        } else {
            setSharedPayload(null);
            setSelectedCategory(CATEGORIES.DOCUMENTS);
            setError(null);
        }
    }, [visible, fetchSharedData]);

    useEffect(() => {
        if (visible && categoryOptions.length > 0) {
            setSelectedCategory(categoryOptions[0].key);
        }
    }, [visible, categoryOptions]);

    const handlePreview = useCallback((document) => {
        if (!document?.url) {
            return;
        }

        const category = getDocumentCategory(document);
        if (category !== CATEGORIES.IMAGES) {
            return;
        }

        setPreviewDocument(document);
    }, []);

    const handleOpenVideo = useCallback(async (video) => {
        if (!video?.url) {
            return;
        }

        try {
            await Linking.openURL(video.url);
        } catch (openError) {
            console.warn('Failed to open portfolio video', openError);
            Alert.alert('Unable to open video', 'This video link appears to be invalid or has expired.');
        }
    }, []);

    const handleDismissPreview = useCallback(() => {
        setPreviewDocument(null);
    }, []);

    const handleDownload = useCallback(async (document) => {
        const downloadUrl = document?.originalUrl || document?.url;
        if (!downloadUrl) {
            Alert.alert('Download unavailable', 'This document does not have a download link.');
            return;
        }

        console.log('[download] platform', Platform.OS);
        console.log('[download] starting', downloadUrl);

        const documentKey = document.id || downloadUrl;
        setDownloadingId(documentKey);

        try {
            const safeBaseName = sanitizeFileName(document.fileName || document.label || 'document');
            const rawExtension = String(getFileExtension(document) || '').replace(/^\.+/, '');
            const extension = rawExtension.split('?')[0] || 'pdf';
            const mimeType = guessMimeType(document, extension);
            const fileNameWithExtension = extension ? `${safeBaseName}.${extension}` : safeBaseName;
            const effectiveDownloadUrl = withDownloadDisposition(downloadUrl, fileNameWithExtension);
            const downloadSourceUrl = Platform.OS === 'web' ? effectiveDownloadUrl : downloadUrl;

            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
                    try {
                        const response = await fetch(effectiveDownloadUrl);

                        if (!response.ok) {
                            throw new Error(`Download failed with status ${response.status}`);
                        }
                        const blob = await response.blob();
                        const objectUrl = window.URL.createObjectURL(blob);
                        const link = window.document.createElement('a');
                        link.href = objectUrl;
                        link.download = fileNameWithExtension;
                        window.document.body.appendChild(link);
                        link.click();
                        window.document.body.removeChild(link);
                        window.URL.revokeObjectURL(objectUrl);
                    } catch (webError) {
                        console.warn('[download] web blob fallback failed, opening original URL', webError);
                        window.open(effectiveDownloadUrl, '_blank', 'noopener,noreferrer');
                    }
                } else {
                    await Linking.openURL(effectiveDownloadUrl);
                }
                return;
            }

            if (typeof FileSystem?.downloadAsync !== 'function') {
                console.warn('[download] downloadAsync unavailable, opening original URL');
                await Linking.openURL(effectiveDownloadUrl);
                return;
            }

            const baseDirectory = [
                FileSystem.documentDirectory,
                FileSystem.cacheDirectory,
                FileSystem.temporaryDirectory,
            ].find((path) => typeof path === 'string' && path.length > 0);

            if (!baseDirectory) {
                console.warn('[download] no storage directory available, opening original URL');
                await Linking.openURL(effectiveDownloadUrl);
                return;
            }

            const normalizedBase = baseDirectory.endsWith('/') ? baseDirectory : `${baseDirectory}/`;
            const documentsDirectory = `${normalizedBase}shared-documents/`;
            try {
                await FileSystem.makeDirectoryAsync(documentsDirectory, { intermediates: true });
            } catch (dirError) {
                const dirMessage = String(dirError?.message || '');
                if (!dirMessage.includes('Directory exists') && !dirMessage.includes('EEXIST')) {
                    console.warn('[download] failed to ensure shared-documents directory', dirError);
                }
            }

            const uniqueSuffix = Date.now();
            const targetFileName = `${safeBaseName}-${uniqueSuffix}.${extension}`;
            const targetUri = `${documentsDirectory}${targetFileName}`;

            const downloadResult = await FileSystem.downloadAsync(downloadSourceUrl, targetUri);

            if (!downloadResult || (downloadResult.status && downloadResult.status >= 400)) {
                throw new Error('Failed to download shared document. Please try again.');
            }
            console.log('[download] download complete', downloadResult.uri);

            const shareAvailable = await Sharing.isAvailableAsync().catch(() => false);
            console.log('[download] sharing available?', shareAvailable);

            if (Platform.OS === 'android') {
                const launched = await openAndroidDocument(downloadResult.uri, mimeType);
                if (launched) {
                    return;
                }
            }

            if (shareAvailable) {
                await Sharing.shareAsync(downloadResult.uri, {
                    mimeType,
                    dialogTitle: document.label || document.fileName || 'Shared document',
                });
                return;
            }

            try {
                const shareResult = await Share.share({
                    title: document.label || document.fileName || 'Shared document',
                    message: downloadResult.uri,
                    url: downloadResult.uri,
                });

                if (shareResult.action === Share.sharedAction) {
                    return;
                }
            } catch (shareError) {
                console.warn('Native share unavailable, falling back to alert', shareError);
            }

            Alert.alert(
                'Download complete',
                `Saved to: ${downloadResult.uri}`,
                [
                    {
                        text: 'Open in browser',
                        onPress: () => Linking.openURL(effectiveDownloadUrl),

                    },
                    { text: 'OK' },
                ],
                { cancelable: true },
            );
        } catch (downloadError) {
            console.error('Unable to download shared document', downloadError);
            const message = downloadError?.message || 'Unable to download this document. Please try again later.';
            Alert.alert(
                'Download failed',
                message,
                [
                    {
                        text: 'Open in browser',
                        onPress: () => Linking.openURL(effectiveDownloadUrl),

                    },
                    { text: 'Cancel', style: 'cancel' },
                ],
            );
        } finally {
            setDownloadingId(null);
        }
    }, []);

    const handleOpenInNewTab = useCallback((document) => {
        const targetUrl = document?.originalUrl || document?.url;
        if (!targetUrl) {
            return;
        }

        const baseName = sanitizeFileName(document.fileName || document.label || 'document');
        const rawExtension = String(getFileExtension(document) || '').replace(/^\.+/, '');
        const extension = rawExtension.split('?')[0];
        const fileNameWithExtension = extension ? `${baseName}.${extension}` : baseName;
        const enrichedUrl = withDownloadDisposition(targetUrl, fileNameWithExtension);

        Linking.openURL(enrichedUrl);
    }, []);

    const filteredDocuments = useMemo(() => {
        if (selectedCategory === CATEGORIES.BACKGROUND) {
            return documents.filter((doc) => getDocumentCategory(doc) === CATEGORIES.BACKGROUND);
        }
        return documents.filter((doc) => getDocumentCategory(doc) === selectedCategory);
    }, [documents, selectedCategory]);

    const renderContent = () => {
        if (loading && !sharedPayload) {
            return (
                <FlatList
                    data={SKELETON_ROWS}
                    renderItem={() => <SkeletonTile />}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.contentContainer}
                />
            );
        }

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <AlertCircle size={32} color="#dc2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchSharedData}>
                        <RefreshCcw size={16} color="#2563eb" />
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!documents.length) {
            return (
                <View style={styles.emptyState}>
                    <FileText size={48} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No documents shared</Text>
                    <Text style={styles.emptySubtitle}>
                        This caregiver hasn't shared any documents with you yet.
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
                <View style={styles.noticeBox}>
                    <ShieldCheck size={18} color="#ea580c" />
                    <Text style={styles.noticeText}>
                        These documents have been securely shared with you. Please handle them with care.
                    </Text>
                </View>

                {categoryOptions.length > 1 && (
                    <View style={styles.segmentedControl}>
                        {categoryOptions.map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={[
                                    styles.segmentButton,
                                    selectedCategory === option.key && styles.segmentButtonActive,
                                ]}
                                onPress={() => setSelectedCategory(option.key)}
                            >
                                <Text
                                    style={[
                                        styles.segmentButtonText,
                                        selectedCategory === option.key && styles.segmentButtonTextActive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.contentSection}>
                    {selectedCategory === CATEGORIES.BACKGROUND && backgroundInfo?.backgroundCheckStatus && (
                        <View style={styles.backgroundSection}>
                            <View style={styles.backgroundHeader}>
                                <Text style={styles.backgroundTitle}>Background Check Status</Text>
                                <Text style={styles.backgroundStatus}>{backgroundInfo.backgroundCheckStatus}</Text>
                            </View>
                        </View>
                    )}

                    {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((document, index) => (
                            <DocumentTile
                                key={document.id || `doc-${index}`}
                                document={document}
                                onDownload={handleDownload}
                                onOpenInNewTab={handleOpenInNewTab}
                                onPreview={handlePreview}
                                isDownloading={downloadingId === (document.id || document.url)}
                            />
                        ))
                    ) : (
                        <Text style={styles.backgroundEmptyText}>
                            No {selectedCategory} found in shared documents.
                        </Text>
                    )}
                </View>

                {hasPortfolioMedia && (
                    <View style={styles.portfolioSection}>
                        <Text style={styles.portfolioTitle}>Portfolio Gallery</Text>

                        {portfolio?.images?.length > 0 && (
                            <>
                                <Text style={styles.portfolioSubtitle}>Images</Text>
                                <View style={styles.portfolioGrid}>
                                    {portfolio.images
                                        .filter((image) => image?.url)
                                        .map((image, index) => (
                                            <TouchableOpacity
                                                key={image.id || `portfolio-image-${index}`}
                                                style={styles.portfolioImageWrapper}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Preview portfolio image ${image.caption || index + 1}`}
                                                onPress={() =>
                                                    setPreviewDocument({
                                                        ...image,
                                                        url: image.url,
                                                        label: image.caption || `Portfolio image ${index + 1}`,
                                                    })
                                                }
                                            >
                                                <Image source={{ uri: image.url }} style={styles.portfolioImage} resizeMode="cover" />
                                            </TouchableOpacity>
                                        ))}
                                </View>
                            </>
                        )}

                        {portfolio?.videos?.length > 0 && (
                            <>
                                <Text style={styles.portfolioSubtitle}>Videos</Text>
                                <View style={styles.portfolioVideoList}>
                                    {portfolio.videos
                                        .filter((video) => video?.url)
                                        .map((video, index) => (
                                            <TouchableOpacity
                                                key={video.id || `portfolio-video-${index}`}
                                                style={styles.portfolioVideoItem}
                                                onPress={() => handleOpenVideo(video)}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Open portfolio video ${video.caption || index + 1}`}
                                            >
                                                <View style={styles.portfolioVideoIcon}>
                                                    <Maximize2 size={16} color="#2563eb" />
                                                </View>
                                                <View style={{ flex: 1, marginRight: 12 }}>
                                                    <Text style={styles.portfolioVideoTitle} numberOfLines={1}>
                                                        {video.caption || `Video ${index + 1}`}
                                                    </Text>
                                                    {(video.uploadedAt || video.uploadedAtRaw) && (
                                                        <Text style={styles.portfolioVideoMeta}>
                                                            Shared {video.uploadedAt || formatDateDisplay(video.uploadedAtRaw)}
                                                        </Text>
                                                    )}
                                                </View>
                                                <ExternalLink size={16} color="#2563eb" />
                                            </TouchableOpacity>
                                        ))}
                                </View>
                            </>
                        )}
                    </View>
                )}
            </ScrollView>
        );
    };

    const caregiverName = caregiver?.name || caregiver?.fullName || 'Caregiver';

    const caregiverInitials = caregiverName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={onClose}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.headerInfo}>
                            <View style={styles.avatarWrapper}>
                                {caregiver?.photoUrl ? (
                                    <Image source={{ uri: caregiver.photoUrl }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarFallbackText}>{caregiverInitials}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.headerTextWrapper}>
                                <Text style={styles.headerTitle}>{caregiverName}'s Shared Documents</Text>
                                <Text style={styles.headerSubtitle}>
                                    {documents.length} document{documents.length !== 1 ? 's' : ''} securely shared with you
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {renderContent()}

                    {loading && sharedPayload && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#2563eb" />
                        </View>
                    )}
                </View>
            </Modal>

            <Modal
                visible={!!previewDocument}
                transparent={true}
                animationType="fade"
                onRequestClose={handleDismissPreview}
            >
                <View style={styles.previewBackdrop}>
                    <TouchableOpacity
                        style={styles.previewBackdropTouchable}
                        activeOpacity={1}
                        onPress={handleDismissPreview}
                    />
                    <View style={styles.previewCard}>
                        <TouchableOpacity style={styles.previewCloseButton} onPress={handleDismissPreview}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>

                        <Image
                            source={{ uri: previewDocument?.url }}
                            style={[styles.previewImage, previewImageStyle]}
                            resizeMode="contain"
                        />

                        <Text style={styles.previewTitle}>
                            {previewDocument?.label || previewDocument?.fileName || 'Image Preview'}
                        </Text>

                        <View style={styles.previewActions}>
                            <TouchableOpacity
                                style={styles.previewActionButton}
                                onPress={() => handleDownload(previewDocument)}
                            >
                                <Download size={16} color="#fff" />
                                <Text style={styles.previewActionText}>Download</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 48 : 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    avatarWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarFallbackText: {
        color: '#312e81',
        fontSize: 20,
        fontWeight: '600',
    },
    headerTextWrapper: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    closeButton: {
        marginLeft: 12,
        padding: 8,
        borderRadius: 999,
        backgroundColor: '#f3f4f6',
    },
    contentScroll: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff7ed',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#fed7aa',
        marginTop: 20,
        gap: 8,
    },
    noticeText: {
        flex: 1,
        fontSize: 13,
        color: '#9a3412',
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 4,
        marginTop: 20,
        gap: 8,
    },
    segmentButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    segmentButtonActive: {
        backgroundColor: '#2563eb',
    },
    segmentButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563eb',
    },
    segmentButtonTextActive: {
        color: '#fff',
    },
    contentSection: {
        marginTop: 24,
        gap: 16,
    },
    tileContainer: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 16,
    },
    tilePreview: {
        width: 64,
        height: 64,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#ede9fe',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tileImage: {
        width: '100%',
        height: '100%',
    },
    tilePreviewOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    tilePreviewOverlayText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1d4ed8',
    },
    tileIconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileContent: {
        flex: 1,
    },
    tileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    tileTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    tileMeta: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 4,
    },
    tileMetaSecondary: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    tileActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
        gap: 6,
    },
    downloadButtonDisabled: {
        opacity: 0.7,
    },
    downloadButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    openButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    openButtonText: {
        color: '#2563eb',
        fontSize: 13,
        fontWeight: '600',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    verifiedText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#166534',
    },
    errorContainer: {
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 12,
        padding: 20,
        gap: 12,
        margin: 20,
    },
    errorText: {
        textAlign: 'center',
        color: '#b91c1c',
        fontSize: 14,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#dbeafe',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: '600',
    },
    backgroundSection: {
        gap: 16,
    },
    backgroundHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    backgroundTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    backgroundStatus: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '500',
        backgroundColor: '#d1fae5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    backgroundEmptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        paddingVertical: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    skeletonBlock: {
        backgroundColor: '#e5e7eb',
    },
    skeletonLine: {
        height: 12,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 6,
    },
    previewBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    previewBackdropTouchable: {
        ...StyleSheet.absoluteFillObject,
    },
    previewCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        gap: 16,
        maxWidth: '90%',
    },
    previewCloseButton: {
        alignSelf: 'flex-end',
        padding: 6,
        borderRadius: 999,
        backgroundColor: '#f3f4f6',
    },
    previewImage: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000000',
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
    },
    previewSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
    },
    previewActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    previewActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: '#2563eb',
        borderRadius: 9999,
    },
    previewActionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
    },
});

export default ApprovedDocumentsModal;