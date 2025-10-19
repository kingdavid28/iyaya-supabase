import React from 'react';
import { View, StyleSheet, FlatList, Image, ScrollView, RefreshControl } from 'react-native';
import { Text, Avatar, Divider, useTheme, IconButton } from 'react-native-paper';
import { Rating } from 'react-native-ratings';
import { format } from 'date-fns';

const ReviewList = ({
  reviews = [],
  currentUserId,
  onEditReview,
  onDeleteReview,
  contentContainerStyle,
  ListEmptyComponent,
  useVirtualizedList = true,
  ...flatListProps
}) => {
  const theme = useTheme();

  const renderReview = ({ item }) => {
    const isCurrentUser = item.reviewerId === currentUserId;
    const canEdit = Boolean(
      onEditReview &&
        (item.canEdit !== false) &&
        (!currentUserId || item.reviewerId === currentUserId)
    );
    const canDelete = Boolean(
      onDeleteReview &&
        (item.canDelete !== false)
    );

    return (
      <View style={styles.reviewContainer}>
        <View style={styles.reviewHeader}>
          <Avatar.Image 
            size={40} 
            source={item.reviewerAvatar ? { uri: item.reviewerAvatar } : require('../../../../assets/profile-placeholder.png')}
            style={styles.avatar}
          />
          <View style={styles.reviewerInfo}>
            <Text style={styles.reviewerName}>
              {isCurrentUser ? 'You' : item.reviewerName}
            </Text>
            <Text style={styles.reviewDate}>
              {format(new Date(item.createdAt), 'MMM d, yyyy')}
            </Text>
            {item.subjectName && (
              <Text style={styles.subjectName}>{item.subjectName}</Text>
            )}
            {item.subjectSubtitle && (
              <Text style={styles.subjectSubtitle}>{item.subjectSubtitle}</Text>
            )}
          </View>
          <View style={styles.ratingContainer}>
            <Rating
              type="star"
              ratingCount={5}
              imageSize={16}
              readonly
              startingValue={item.rating}
              style={styles.ratingStars}
            />
          </View>
          {(canEdit || canDelete) && (
            <View style={styles.actions}>
              {canEdit && (
                <IconButton
                  icon="pencil"
                  size={18}
                  onPress={() => onEditReview?.(item)}
                  accessibilityLabel="Edit review"
                />
              )}
              {canDelete && (
                <IconButton
                  icon="delete"
                  size={18}
                  onPress={() => onDeleteReview?.(item)}
                  accessibilityLabel="Delete review"
                />
              )}
            </View>
          )}
        </View>
        
        {item.comment && (
          <Text style={styles.comment}>{item.comment}</Text>
        )}
        
        {item.images && item.images.length > 0 && (
          <FlatList
            horizontal
            data={item.images}
            keyExtractor={(_, index) => `image-${index}`}
            renderItem={({ item: imageUri }) => (
              <Image 
                source={{ uri: imageUri }} 
                style={styles.reviewImage}
                resizeMode="cover"
              />
            )}
            contentContainerStyle={styles.imagesContainer}
            showsHorizontalScrollIndicator={false}
          />
        )}
        
        <Divider style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant }]} />
      </View>
    );
  };

  const mergedContentStyle = [
    styles.container,
    contentContainerStyle,
    reviews.length === 0 && styles.emptyContainerPadding
  ];

  const defaultEmptyComponent = (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No reviews yet</Text>
    </View>
  );

  const renderNode = (Component) => {
    if (!Component) return null;
    if (React.isValidElement(Component)) {
      return Component;
    }
    if (typeof Component === 'function') {
      return <Component />;
    }
    return null;
  };

  if (!useVirtualizedList) {
    const {
      ListHeaderComponent,
      ListFooterComponent,
      onRefresh,
      refreshing,
      ...restProps
    } = flatListProps;

    const refreshControl = onRefresh
      ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        )
      : undefined;

    const hasReviews = reviews.length > 0;

    return (
      <ScrollView
        contentContainerStyle={mergedContentStyle}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        {...restProps}
      >
        {renderNode(ListHeaderComponent)}
        {hasReviews
          ? reviews.map((review) => (
              <React.Fragment key={review.id}>
                {renderReview({ item: review })}
              </React.Fragment>
            ))
          : (ListEmptyComponent ?? defaultEmptyComponent)}
        {renderNode(ListFooterComponent)}
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={reviews}
      renderItem={renderReview}
      keyExtractor={(item) => item.id}
      contentContainerStyle={mergedContentStyle}
      ListEmptyComponent={ListEmptyComponent ?? defaultEmptyComponent}
      {...flatListProps}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  reviewContainer: {
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginTop: 2,
  },
  subjectSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  ratingStars: {
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    color: '#333',
  },
  imagesContainer: {
    marginBottom: 12,
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  emptyContainerPadding: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default ReviewList;
