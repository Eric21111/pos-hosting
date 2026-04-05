import { Picker } from "@react-native-picker/picker";
import { Platform, StyleSheet, View } from "react-native";

/**
 * Native iOS/Android: @react-native-picker/picker.
 * Web implementation lives in FormSelect.web.jsx (native HTML select) so the
 * chosen label is visible in the browser.
 *
 * Android: Spinner text often inherits a light/white color on white backgrounds;
 * we set explicit colors so the selected label stays visible after a choice.
 */
export default function FormSelect({
  items,
  selectedValue,
  onValueChange,
  enabled = true,
  style,
}) {
  return (
    <View style={[styles.pickerWrap, style]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        enabled={enabled}
        style={styles.picker}
        itemStyle={Platform.OS === "ios" ? styles.pickerItemIOS : undefined}
        dropdownIconColor="#6b7280"
        mode={Platform.OS === "android" ? "dropdown" : undefined}
      >
        {items.map(({ label, value }) => (
          <Picker.Item
            key={value === "" ? "__placeholder__" : String(value)}
            label={label}
            value={value}
            color="#111827"
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: {
    color: "#111827",
    backgroundColor: "#ffffff",
    ...(Platform.OS === "android" ? { minHeight: 48 } : {}),
  },
  pickerItemIOS: {
    color: "#111827",
    fontSize: 15,
  },
});
