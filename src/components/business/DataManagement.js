import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { settingsService } from '../../services/settingsService';

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildExportHtml = (payload) => {
  const jsonString = JSON.stringify(payload, null, 2) || '{}';
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Iyaya Data Export</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #111827; }
        h1 { margin-top: 0; font-size: 24px; color: #0ea5e9; }
        p { color: #4b5563; }
        pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
        footer { margin-top: 32px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <h1>Iyaya Data Export</h1>
      <p>Generated at ${escapeHtml(new Date().toISOString())}</p>
      <pre>${escapeHtml(jsonString)}</pre>
      <footer>Iyaya — Childcare Services Platform</footer>
    </body>
  </html>`;
};

const formatTimestamp = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function DataManagement({ user, userType, colors }) {
  const [activeSection, setActiveSection] = useState('profile');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const sections = [
    { id: 'profile', label: 'Profile Data', icon: 'person-outline' },
    { id: 'jobs', label: 'Jobs', icon: 'briefcase-outline' },
    { id: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
    { id: 'applications', label: 'Applications', icon: 'document-text-outline' },
  ];

  const loadData = useCallback(async (section) => {
    setLoading(true);
    try {
      let result;
      switch (section) {
        case 'profile': {
          result = await settingsService.getProfile();
          setData(result ? [result] : []);
          break;
        }
        case 'jobs':
        case 'bookings':
        case 'applications': {
          result = await settingsService.getDataUsage({
            userId: user?.id,
            userType,
          });
          setData(result?.[section] || []);
          break;
        }
        default:
          setData([]);
      }
    } catch (error) {
      console.error('Data load failed:', error);
      Alert.alert('Error', 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userType]);

  useEffect(() => {
    loadData(activeSection);
  }, [activeSection, loadData]);

  const resolveId = (item) => item?.id || item?._id;

  const resolveTitle = (item) => item?.name || item?.title || item?.family || 'Unnamed Item';

  const resolveSubtitle = (item) =>
    item?.email || item?.location || item?.status || item?.contact_phone || 'No details available';

  const resolveMeta = (item) => {
    const parts = [];
    const id = resolveId(item);
    if (id) parts.push(`ID: ${id}`);
    if (item?.status) parts.push(`Status: ${item.status}`);

    const createdAt = formatTimestamp(item?.created_at || item?.createdAt);
    if (createdAt) {
      parts.push(`Created: ${createdAt}`);
    }

    const updatedAt = formatTimestamp(item?.updated_at || item?.updatedAt);
    if (updatedAt) {
      parts.push(`Updated: ${updatedAt}`);
    }

    return parts.join(' • ');
  };

  const canDeleteRecord = useCallback(
    (section, item) => {
      if (!user?.id) {
        return false;
      }

      if (section === 'jobs') {
        const ownerId = item?.parentId || item?.clientId || item?.parent_id;
        if (ownerId) {
          return ownerId === user.id && userType === 'parent';
        }
        return userType === 'parent';
      }

      if (section === 'bookings') {
        const ownerId = item?.parentId || item?.parent_id;
        if (ownerId) {
          return ownerId === user.id && userType === 'parent';
        }
        return userType === 'parent';
      }

      if (section === 'applications') {
        const caregiverId = item?.caregiverId || item?.caregiver_id;
        if (caregiverId) {
          return caregiverId === user.id && userType === 'caregiver';
        }
        return userType === 'caregiver';
      }

      return false;
    },
    [user?.id, userType]
  );

  const handleDelete = useCallback((item) => {
    const id = resolveId(item);
    if (!id) {
      Alert.alert('Delete unavailable', 'We could not determine which record to delete.');
      return;
    }

    if (!canDeleteRecord(activeSection, item)) {
      const restrictionMessage = {
        jobs: 'Only parents can delete their own job postings.',
        bookings: 'Only parents can delete their own bookings.',
        applications: 'Only caregivers can delete their own applications.',
      };

      Alert.alert('Action restricted', restrictionMessage[activeSection] || 'You do not have permission to delete this item.');
      return;
    }

    const entityLabelMap = {
      jobs: 'Job',
      bookings: 'Booking',
      applications: 'Application',
    };

    const entityLabel = entityLabelMap[activeSection] || 'Item';

    const performDelete = async () => {
      setDeletingId(id);
      try {
        if (activeSection === 'jobs') {
          await settingsService.deleteJob(id);
        } else if (activeSection === 'bookings') {
          await settingsService.deleteBooking(id);
        } else if (activeSection === 'applications') {
          await settingsService.deleteApplication(id);
        } else {
          throw new Error('Deletion is not supported for this data type.');
        }

        Alert.alert('Deleted', `${entityLabel} deleted successfully.`);
        await loadData(activeSection);
      } catch (error) {
        console.error('Data delete failed:', error);
        Alert.alert('Error', error?.message || `Failed to delete the ${entityLabel.toLowerCase()}.`);
      } finally {
        setDeletingId(null);
      }
    };

    Alert.alert(
      `Delete ${entityLabel}`,
      `Are you sure you want to delete this ${entityLabel.toLowerCase()}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete() },
      ]
    );
  }, [activeSection, canDeleteRecord, loadData]);

  const renderItem = (item, index) => {
    const recordId = resolveId(item);
    const canDelete = canDeleteRecord(activeSection, item);
    const showDelete = ['jobs', 'bookings', 'applications'].includes(activeSection) && canDelete;
    const isDeleting = deletingId === recordId;

    return (
      <View key={recordId || index} style={styles.dataItem}>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{resolveTitle(item)}</Text>
          <Text style={styles.itemSubtitle}>{resolveSubtitle(item)}</Text>
          {resolveMeta(item) ? (
            <Text style={styles.itemMeta}>{resolveMeta(item)}</Text>
          ) : null}
        </View>

        {showDelete && (
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityHint={`Delete this ${activeSection.slice(0, -1)}`}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#B91C1C" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Data Management</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionTabs}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.sectionTab,
              activeSection === section.id && [styles.activeSectionTab, { borderBottomColor: colors.primary }]
            ]}
            onPress={() => {
              setActiveSection(section.id);
              loadData(section.id);
            }}
          >
            <Ionicons
              name={section.icon}
              size={18}
              color={activeSection === section.id ? colors.primary : '#6B7280'}
            />
            <Text
              style={[
                styles.sectionTabText,
                activeSection === section.id && { color: colors.primary }
              ]}
            >
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.dataContainer}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : data.length > 0 ? (
          data.map((item, index) => renderItem(item, index))
        ) : (
          <Text style={styles.emptyText}>No data available</Text>
        )}

        <View style={styles.exportSection}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary }, exporting && styles.disabledButton]}
            onPress={async () => {
              if (exporting) return;
              setExporting(true);
              try {
                const exportPayload = await settingsService.exportUserData({ userId: user?.id, userType });
                if (!exportPayload) {
                  throw new Error('No export data available');
                }

                const html = buildExportHtml(exportPayload);
                const fileName = `iyaya-data-export-${Date.now()}.pdf`;
                let pdfResult;

                try {
                  pdfResult = await Print.printToFileAsync({ html, base64: Platform.OS === 'web' });
                } catch (printError) {
                  throw new Error(printError?.message || 'Unable to generate PDF file.');
                }

                if (Platform.OS === 'web') {
                  if (pdfResult?.base64) {
                    const link = document.createElement('a');
                    link.href = `data:application/pdf;base64,${pdfResult.base64}`;
                    link.download = fileName;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    Alert.alert('Success', 'PDF downloaded to your device.');
                  } else {
                    throw new Error('PDF generation is not supported on this platform.');
                  }
                  return;
                }

                const sharingAvailable = await Sharing.isAvailableAsync();
                if (sharingAvailable && pdfResult?.uri) {
                  await Sharing.shareAsync(pdfResult.uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share exported data',
                    UTI: 'com.adobe.pdf',
                  });
                  Alert.alert('Success', 'PDF ready. Complete the download from the share sheet.');
                } else if (pdfResult?.uri) {
                  Alert.alert('Success', `PDF saved to: ${pdfResult.uri}`);
                } else {
                  throw new Error('Failed to generate PDF file.');
                }
              } catch (error) {
                console.error('Data export failed:', error);
                Alert.alert('Error', error?.message || 'Failed to export data');
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
          >
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>{exporting ? 'Generating PDF…' : 'Export All Data'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  sectionTabs: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSectionTab: {
    borderBottomWidth: 2,
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  dataContainer: {
    flex: 1,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 32,
  },
  exportSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  }
});
