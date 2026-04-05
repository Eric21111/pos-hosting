import { StyleSheet, View } from "react-native";

/** Plain CSS for DOM <select> (RN StyleSheet IDs are unreliable on raw elements). */
const WEB_SELECT_STYLE = {
  width: "100%",
  padding: 12,
  fontSize: 15,
  borderStyle: "none",
  borderWidth: 0,
  backgroundColor: "transparent",
  outlineStyle: "none",
  cursor: "pointer",
  fontFamily: "system-ui, -apple-system, sans-serif",
  color: "#111827",
};

/**
 * Web: native <select> so the current selection is visible (RN Picker is unreliable on web).
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
      <select
        disabled={!enabled}
        value={selectedValue}
        onChange={(e) => onValueChange(e.target.value)}
        style={WEB_SELECT_STYLE}
      >
        {items.map(({ label, value }) => (
          <option
            key={value === "" ? "__placeholder__" : String(value)}
            value={value}
          >
            {label}
          </option>
        ))}
      </select>
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
});
