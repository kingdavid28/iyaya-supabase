import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressHeader: {
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  autoSaveText: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6366f1',
  },
  profileImage: {
    backgroundColor: '#f3f4f6',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#6366f1',
    backgroundColor: '#f3f4f6',
  },
  profileImageDirect: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    backgroundColor: '#e5e7eb',
  },
  photoHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  skillsSection: {
    marginBottom: 24,
  },
  suggestedSkills: {
    marginBottom: 20,
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#dbeafe',
    marginRight: 8,
    marginBottom: 8,
  },
  addSkillContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    gap: 12,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  addButton: {
    marginBottom: 8,
  },
  selectedSkills: {
    marginTop: 16,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  divider: {
    marginVertical: 24,
    backgroundColor: '#e5e7eb',
  },
  certificationsSection: {
    marginBottom: 24,
  },
  availabilitySection: {
    marginBottom: 24,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dayButtonTextSelected: {
    color: '#ffffff',
  },
  hoursSection: {
    marginBottom: 24,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  timeSeparator: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  flexibilitySection: {
    marginTop: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  reviewCard: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reviewImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  reviewItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    width: 120,
  },
  reviewValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 0,
    gap: 16,
  },
  navButton: {
    flex: 1,
  },
  locationSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  gpsButton: {
    marginBottom: 16,
    paddingVertical: 12,
    width: '100%',
  },
  searchButton: {
    paddingVertical: 12,
    width: '100%',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  coordinatesDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginTop: 8,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  locationDialog: {
    maxHeight: '80%',
    borderRadius: 12,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
  },
  searchLoadingText: {
    marginLeft: 12,
    color: '#666',
    fontSize: 14,
  },
  searchResults: {
    marginTop: 16,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  documentsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  documentCard: {
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  requiredText: {
    color: '#ef4444',
  },
  documentDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  uploadedBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  verifiedBadge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  uploadedDocument: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentFileName: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButton: {
    borderColor: '#6366f1',
  },
  documentsSummary: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  reviewPlaceholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  certificationsContainer: {
    gap: 12,
  },
  certificationCard: {
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  certificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  certificationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  certificationFile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  certificationFileText: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 4,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  dateInput: {
    marginVertical: 5,
  },
  filePreviewText: {
    fontSize: 14,
    color: '#0369a1',
    flex: 1,
  },
  experienceSection: {
    marginBottom: 24,
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emergencyContactForm: {
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emergencyContactsList: {
    gap: 12,
  },
  emergencyContactCard: {
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emergencyContactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emergencyContactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  emergencyContactDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  backgroundCheckCard: {
    elevation: 2,
    marginTop: 12,
  },
  backgroundCheckHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  backgroundCheckTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },
  backgroundCheckDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  backgroundCheckFeatures: {
    marginBottom: 24,
  },
  backgroundCheckFeature: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  backgroundCheckActions: {
    gap: 16,
  },
  backgroundCheckButton: {
    paddingVertical: 12,
  },
  ageCareContainer: {
    gap: 16,
    marginBottom: 24,
  },
  ageCareCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  ageCareCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f9ff',
  },
  ageCareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ageCareLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  ageCareSelectedText: {
    color: '#6366f1',
  },
  ageCareDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  portfolioUploadSection: {
    marginBottom: 24,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  portfolioItem: {
    width: (width - 56) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  portfolioImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
  },
  portfolioCaption: {
    padding: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  portfolioRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  finalChecks: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  finalChecksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  profileImageCard: {
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  basicInfoCard: {
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bioCard: {
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  profileImageDisplay: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
});