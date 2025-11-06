import React, { useCallback } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SECTION_SPACING = 16;

const buildSections = (isParent) => [
    {
        title: 'Our commitment',
        body: isParent
            ? 'We protect your family’s private information with role-based access, explicit consent, and audit trails for every data share.'
            : 'We protect your profile and work history with role-based access, explicit consent, and audit trails for every data share.',
    },
    {
        title: 'Who can view your data',
        bullets: [
            'Only verified users in active conversations or bookings can request sensitive details.',
            'Each request must specify individual fields—blanket requests are rejected automatically.',
            'You decide whether to approve, decline, or revoke access at any time.',
        ],
    },
    {
        title: 'When information is shared',
        body: 'Approved data is shared securely for the timeframe you set (default 14 days). After that, access expires unless you renew it.',
    },
    {
        title: 'Revoking access',
        bullets: [
            'Open the Privacy Requests tab to revoke any active share instantly.',
            'Revocation removes the requester’s access and sends them an automatic notification.',
        ],
    },
    {
        title: 'Data we never share automatically',
        bullets: [
            'Government IDs or background-check source documents',
            'End-to-end encrypted direct messages',
            'Payment credentials or bank information',
        ],
    },
    {
        title: 'Need help?',
        body: 'Contact support@iyaya.app if you need to report abuse, request a data export, or ask privacy questions.',
        ctaLabel: 'Email the Iyaya support team',
        ctaTarget: 'mailto:support@iyaya.app?cc=kingdavid28a@gmail.com',
        ctaBackupTarget: 'mailto:kingdavid28a@gmail.com',
    },
];

const PrivacyPolicyModal = ({ visible, onClose, userType = 'caregiver' }) => {
    const isParent = userType === 'parent';
    const sections = buildSections(isParent);

    const handleCtaPress = useCallback(async (primary, fallback) => {
        const openMailLink = async (link) => {
            const canOpen = await Linking.canOpenURL(link);
            if (canOpen) {
                await Linking.openURL(link);
                return true;
            }
            return false;
        };

        try {
            if (primary && await openMailLink(primary)) {
                return;
            }
            if (fallback && await openMailLink(fallback)) {
                return;
            }
        } catch (error) {
            // fall through to alert
        }

        Alert.alert(
            'Unable to open email',
            'Please reach out directly at support@iyaya.app and kingdavid28a@gmail.com.'
        );
    }, []);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Privacy Data Policies</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close privacy policies"
                    >
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.subtitle}>
                        {isParent
                            ? 'These guidelines explain how family information is stored, shared, and protected inside Iyaya.'
                            : 'These guidelines explain how your caregiver profile information is stored, shared, and protected inside Iyaya.'}
                    </Text>

                    {sections.map((section) => (
                        <View key={section.title} style={styles.section}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            {section.body ? <Text style={styles.body}>{section.body}</Text> : null}
                            {section.bullets ? (
                                <View style={styles.bulletList}>
                                    {section.bullets.map((item) => (
                                        <View key={item} style={styles.bulletRow}>
                                            <Text style={styles.bulletMarker}>•</Text>
                                            <Text style={styles.bulletText}>{item}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            {section.ctaLabel && section.ctaTarget ? (
                                <TouchableOpacity
                                    style={styles.ctaButton}
                                    onPress={() => handleCtaPress(section.ctaTarget, section.ctaBackupTarget)}
                                >
                                    <Text style={styles.ctaButtonText}>{section.ctaLabel}</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    closeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563EB',
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        paddingBottom: 48,
        gap: SECTION_SPACING,
    },
    subtitle: {
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 22,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    body: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    bulletList: {
        gap: 8,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    bulletMarker: {
        fontSize: 16,
        color: '#2563EB',
        lineHeight: 22,
    },
    bulletText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    ctaButton: {
        marginTop: 12,
        alignSelf: 'flex-start',
        backgroundColor: '#2563EB',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    ctaButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default PrivacyPolicyModal;