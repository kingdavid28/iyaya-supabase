import React from 'react';
import { View } from 'react-native';
import { Plus, Calendar, MessageCircle, Search } from 'lucide-react-native';
import QuickAction from './QuickAction';
import { colors } from '../../styles/ParentDashboard.styles';

const styleFor = (id) => {
  switch (id) {
    case 'find':
      return { color: colors.secondary, bgColor: '#FFF1F7' };
    case 'book':
      return { color: colors.info, bgColor: '#EFF6FF' };
    case 'messages':
      return { color: colors.primary, bgColor: '#F5F3FF' };
    case 'add-child':
      return { color: colors.success, bgColor: '#ECFDF5' };
    default:
      return { color: colors.primary, bgColor: colors.surface };
  }
};

const renderIcon = (iconName) => {
  switch (iconName) {
    case 'plus': return Plus;
    case 'calendar': return Calendar;
    case 'message-circle': return MessageCircle;
    case 'search': return Search;
    default: return Plus;
  }
};

const QuickActions = ({ actions }) => {

  const rows = [];
  for (let i = 0; i < actions.length; i += 2) {
    rows.push(actions.slice(i, i + 2));
  }

  return (
    <View style={{ paddingTop: 4 }}>
      {rows.map((row, idx) => (
        <View key={`qa-row-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          {row.map((action) => {
            const style = styleFor(action.id);
            const IconComponent = renderIcon(action.icon);
            return (
              <QuickAction
                key={action.id}
                icon={IconComponent}
                label={action.title}
                color={style.color}
                bgColor={style.bgColor}
                onPress={action.onPress}
                testID={`quick-action-${action.id}`}
              />
            );
          })}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
};

export default QuickActions;
