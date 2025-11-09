import {
    AlertCircle,
    Download,
    ExternalLink,
    FileText,
    Image as ImageIcon,
    RefreshCcw,
    ShieldCheck,
    X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { privacyAPI } from '../../../config/api';

const CATEGORIES = {
    DOCUMENTS: 'documents',
    IMAGES: 'images',
    BACKGROUND: 'background',
};

const SKELETON_ROWS = Array.from({ length: 3 }).map((_, index) => ({
    id: `skeleton-${index}`,
}));

const getDocumentCategory = (document) => {
    const type = String(document?.type || document?.category || '').toLowerCase();
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

const DocumentTile = ({ document, onDownload, onOpenInNewTab }) => {
    const category = getDocumentCategory(document);
    const isImagePreview = category === CATEGORIES.IMAGES && document?.url;
    const uploadedAt = document?.uploadedAt || document?.createdAt || document?.created_at;
    const uploadedLabel = uploadedAt
        ? `Uploaded ${new Date(uploadedAt).toLocaleDateString()}`
        : 'Upload date unavailable';

    return (
        <View style={styles.tileContainer}>
            <View style={styles.tilePreview}>
                {isImagePreview ? (
                    <Image source={{ uri: document.url }} style={styles.tileImage} resizeMode="cover" />
                ) : (
                    <View style={styles.tileIconWrapper}>
                        <FileText size={22} color="#4338ca" />
                    </View>
                )}
            </View>

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
                    {document?.type || document?.category || 'Document'}
                </Text>
                <Text style={styles.tileMetaSecondary}>{uploadedLabel}</Text>

                <View style={styles.tileActions}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.downloadButton}
                        onPress={() => onDownload(document)}
                    >
                        <Download size={16} color="#fff" />
                        <Text style={styles.downloadButtonText}>Download</Text>
                    </TouchableOpacity>

                    {Platform.OS === 'web' && document?.url ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            style={styles.openButton}
                            onPress={() => onOpenInNewTab?.(document)}
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

    const documents = useMemo(() => sharedPayload?.documents || [], [sharedPayload]);
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
            setSharedPayload(response);
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

    const handleDownload = useCallback(async (document) => {
        if (!document?.url) {
            return;
        }

        try {
            const canOpen = await Linking.canOpenURL(document.url);
            if (!canOpen) {
                throw new Error('Unsupported URL');
            }
            await Linking.openURL(document.url);
        } catch (downloadError) {
            console.error('Unable to open shared document', downloadError);
        }
    }, []);

    const handleOpenInNewTab = useCallback((document) => {
        if (Platform.OS === 'web' && document?.url && typeof window !== 'undefined') {
            window.open(document.url, '_blank', 'noopener,noreferrer');
        }
    }, []);

    const backgroundDocuments = useMemo(
        () => documents.filter((doc) => getDocumentCategory(doc) === CATEGORIES.BACKGROUND),
        [documents],
    );

    const filteredDocuments = useMemo(() => {
        if (selectedCategory === CATEGORIES.BACKGROUND) {
            return backgroundDocuments;
        }

        return documents.filter((doc) => getDocumentCategory(doc) === selectedCategory);
    }, [backgroundDocuments, documents, selectedCategory]);

    const renderCategoryControls = () => (
        <View style={styles.segmentedControl}>
            {categoryOptions.map((option) => {
                const isActive = option.key === selectedCategory;
                const textStyle = isActive ? styles.segmentButtonTextActive : styles.segmentButtonText;
                const iconColor = isActive ? '#fff' : '#2563eb';

                return (
                    <TouchableOpacity
                        key={option.key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                        onPress={() => setSelectedCategory(option.key)}
                    >
                        {option.key === CATEGORIES.IMAGES ? <ImageIcon size={16} color={iconColor} /> : null}
                        <Text style={textStyle}>{option.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const renderContent = () => {
        if (loading) {
            return SKELETON_ROWS.map((row) => <SkeletonTile key={row.id} />);
        }

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <AlertCircle size={22} color="#dc2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchSharedData}>
                        <RefreshCcw size={16} color="#2563eb" />
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (selectedCategory === CATEGORIES.BACKGROUND) {
            return (
                <View style={styles.backgroundSection}>
                    <View style={styles.backgroundHeader}>
                        <ShieldCheck size={18} color="#15803d" />
                        <Text style={styles.backgroundTitle}>Background Check</Text>
                    </View>
                    <Text style={styles.backgroundStatus}>
                        {backgroundInfo?.backgroundCheckStatus || 'Status unavailable'}
                    </Text>

                    {backgroundDocuments.length ? (
                        <FlatList
                            data={backgroundDocuments}
                            keyExtractor={(item) => item.id || item.url}
                            scrollEnabled={false}
                            renderItem={({ item }) => (
                                <DocumentTile document={item} onDownload={handleDownload} onOpenInNewTab={handleOpenInNewTab} />
                            )}
                            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                            ListFooterComponent={<View style={{ height: 12 }} />}
                        />
                    ) : (
                        <Text style={styles.backgroundEmptyText}>
                            No background check documents were shared. Ask the caregiver if you need supporting paperwork.
                        </Text>
                    )}
                </View>
            );
        }

        if (!filteredDocuments.length) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>
                        {selectedCategory === CATEGORIES.IMAGES ? 'No shared images' : 'No shared documents'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        Caregivers can share items in this category whenever they approve your request.
                    </Text>
                </View>
            );
        }

        return filteredDocuments.map((document) => (
            <DocumentTile
                key={document.id || document.url}
                document={document}
                onDownload={handleDownload}
                onOpenInNewTab={handleOpenInNewTab}
            />
        ));
    };

    const caregiverInitial = caregiver?.name ? caregiver.name.charAt(0).toUpperCase() : 'C';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
            transparent={false}
        >
            <View style={styles.modalContainer}>
                <View style={styles.header}>
                    <View style={styles.headerInfo}>
                        <View style={styles.avatarWrapper}>
                            {caregiver?.avatar ? (
                                <Image source={{ uri: caregiver.avatar }} style={styles.avatarImage} resizeMode="cover" />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarFallbackText}>{caregiverInitial}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.headerTextWrapper}>
                            <Text style={styles.headerTitle}>{caregiver?.name || 'Caregiver'}</Text>
                            <Text style={styles.headerSubtitle}>Approved documents & images</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button">
                        <X size={20} color="#1f2937" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
                    <View style={styles.noticeBox}>
                        <AlertCircle size={18} color="#f97316" style={{ marginRight: 8 }} />
                        <Text style={styles.noticeText}>
                            These items were shared via caregiver approval and can be revoked at any time.
                        </Text>
                    </View>

                    {renderCategoryControls()}

                    <View style={styles.contentSection}>{renderContent()}</View>
                </ScrollView>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#2563eb" />
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = {
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
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
    },
    tileImage: {
        width: '100%',
        height: '100%',
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
        gap: 8,
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
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
};

export default ApprovedDocumentsModal;