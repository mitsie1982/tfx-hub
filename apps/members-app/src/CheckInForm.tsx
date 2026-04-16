import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function CheckInForm({ onSubmit }) {
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    onSubmit(notes);
    setNotes("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Check-In</Text>
      <Text style={styles.label}>How is your week going? Any blockers or highlights?</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Your notes..." multiline />
      <Button title="Submit Check-In" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 8,
    margin: 16,
    alignItems: "stretch",
    elevation: 2,
  },
  title: {
    fontSize: 18,
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
