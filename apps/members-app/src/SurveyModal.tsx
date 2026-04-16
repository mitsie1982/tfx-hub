import { useState } from "react";
import { Button, Modal, StyleSheet, Text, TextInput, View } from "react-native";

export default function SurveyModal({ visible, onClose, onSubmit }) {
  const [feedback, setFeedback] = useState("");

  function handleSubmit() {
    onSubmit(feedback);
    setFeedback("");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Job Feedback Survey</Text>
          <Text style={styles.label}>How was your experience with this job?</Text>
          <TextInput
            style={styles.input}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Your feedback..."
            multiline
          />
          <Button title="Submit" onPress={handleSubmit} />
          <Button title="Cancel" onPress={onClose} color="#888" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 8,
    width: "80%",
    alignItems: "stretch",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: "top",
  },
});
