import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { submitFeedback } from "../api/client";
import { ScoringFeedbackRequest } from "../types";

interface Props {
  lat: number;
  lon: number;
  originalScore: number;
  conditionsSnapshot?: Record<string, unknown>;
  onDismiss: () => void;
}

export default function FeedbackPrompt({
  lat,
  lon,
  originalScore,
  conditionsSnapshot,
  onDismiss,
}: Props) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      const data: ScoringFeedbackRequest = {
        lat,
        lon,
        original_score: originalScore,
        user_rating: rating,
        conditions_snapshot: conditionsSnapshot,
      };
      if (comment.trim()) data.comment = comment.trim();
      await submitFeedback(data);
      setSubmitted(true);
    } catch (e: any) {
      console.warn("Feedback failed:", e.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.thanks}>Thanks for your feedback!</Text>
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How was the ride?</Text>
      <Text style={styles.subtitle}>
        Score predicted: {originalScore.toFixed(0)}
      </Text>

      <View style={styles.ratingRow}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.ratingBtn, rating === n && styles.ratingBtnActive]}
            onPress={() => setRating(n)}
          >
            <Text
              style={[
                styles.ratingText,
                rating === n && styles.ratingTextActive,
              ]}
            >
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.commentInput}
        value={comment}
        onChangeText={setComment}
        placeholder="Optional comment..."
        placeholderTextColor="#484f58"
        multiline
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.skipBtn} onPress={onDismiss}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!rating || loading) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!rating || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#161b22",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    color: "#f0f6fc",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#8b949e",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  ratingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#21262d",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#30363d",
  },
  ratingBtnActive: {
    backgroundColor: "#1f6feb",
    borderColor: "#58a6ff",
  },
  ratingText: { color: "#8b949e", fontSize: 18, fontWeight: "700" },
  ratingTextActive: { color: "#fff" },
  commentInput: {
    backgroundColor: "#0d1117",
    color: "#f0f6fc",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#30363d",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#21262d",
  },
  skipText: { color: "#58a6ff", fontSize: 15, fontWeight: "600" },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#238636",
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  thanks: {
    color: "#3fb950",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  dismissBtn: { alignItems: "center", paddingVertical: 10 },
  dismissText: { color: "#58a6ff", fontSize: 15 },
});
