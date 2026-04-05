import { Platform } from "react-native";

/** Android: hint/placeholder contrast on white fields */
export const PLACEHOLDER_PH = "#9ca3af";

/** Visible item text on Android Spinner + iOS picker */
export const PICKER_ITEM_COLOR = "#111827";

/** Spread onto @react-native-picker/picker (same as FormSelect.jsx) */
export const nativePickerProps = {
  style: {
    color: PICKER_ITEM_COLOR,
    backgroundColor: "#ffffff",
    ...(Platform.OS === "android" ? { minHeight: 48 } : {}),
  },
  itemStyle:
    Platform.OS === "ios"
      ? { color: PICKER_ITEM_COLOR, fontSize: 15 }
      : undefined,
  dropdownIconColor: "#6b7280",
  mode: Platform.OS === "android" ? "dropdown" : undefined,
};
