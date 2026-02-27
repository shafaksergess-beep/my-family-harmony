import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Card, Title, Paragraph, useTheme, List, Divider } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useFamily } from '../../context/FamilyContext';

interface HealthData {
  score: number;
  status: string;
  analysis: string;
  improvements: string[];
}

export default function FamilyHealthScore() {
  const { selectedFamily } = useFamily();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const fetchHealthScore = useCallback(async () => {
    if (!selectedFamily?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('family-health-score', {
        body: { familyId: selectedFamily.id },
      });
      if (error) throw error;
      setHealthData(data);
    } catch (error) {
      console.error('Error fetching health score:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFamily?.id]);

  useEffect(() => {
    if (selectedFamily?.id) {
      fetchHealthScore();
    }
  }, [selectedFamily?.id, fetchHealthScore]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 50) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing group health...</Text>
        </View>
      </Card>
    );
  }

  if (!healthData) return null;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View>
            <Title>Family Health Score</Title>
            <Text style={[styles.statusTag, { backgroundColor: getScoreColor(healthData.score) + '20', color: getScoreColor(healthData.score) }]}>
              {healthData.status}
            </Text>
          </View>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(healthData.score) }]}>
            <Text style={[styles.scoreText, { color: getScoreColor(healthData.score) }]}>{healthData.score}</Text>
          </View>
        </View>

        <Paragraph style={styles.analysis}>
          {healthData.analysis}
        </Paragraph>

        <Divider style={styles.divider} />

        <Title style={styles.subtitle}>Recommendations</Title>
        {healthData.improvements.map((improvement, index) => (
          <List.Item
            key={index}
            title={improvement}
            titleNumberOfLines={2}
            left={props => <List.Icon {...props} icon="information-outline" color={theme.colors.primary} />}
            style={styles.listItem}
          />
        ))}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusTag: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  analysis: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  divider: {
    marginVertical: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listItem: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
});
