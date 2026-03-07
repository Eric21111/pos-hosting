import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const StockInModal = ({ visible, onClose, product, onConfirm, loading }) => {
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [sizeQuantities, setSizeQuantities] = useState({});
  const [variantQuantities, setVariantQuantities] = useState({}); // { "S": { "Blue": 5, "White": 3 } }
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Restock");
  const [otherReason, setOtherReason] = useState("");
  const [newVariantInputs, setNewVariantInputs] = useState({}); // { "S": "Red" }
  const [addedVariants, setAddedVariants] = useState([]); // New variants added by user

  // Default sizes if none exist
  const allSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
  const reasons = ["Restock", "Returned Item", "Exchange", "Other"];

  const hasSizes =
    product?.sizes &&
    typeof product.sizes === "object" &&
    Object.keys(product.sizes).length > 0;

  // Helper to get quantity from size data
  const getSizeQuantity = (sizeData) => {
    if (
      typeof sizeData === "object" &&
      sizeData !== null &&
      sizeData.quantity !== undefined
    ) {
      return sizeData.quantity;
    }
    return typeof sizeData === "number" ? sizeData : 0;
  };

  // Helper to check if a size has variants
  const getSizeVariants = (size) => {
    if (
      hasSizes &&
      product.sizes[size] &&
      typeof product.sizes[size] === "object" &&
      product.sizes[size].variants
    ) {
      return product.sizes[size].variants;
    }
    return null;
  };

  // Get all unique variants from the product (including newly added ones)
  const getAllVariants = () => {
    const variantSet = new Set();
    if (hasSizes) {
      Object.values(product.sizes).forEach((sizeData) => {
        if (typeof sizeData === "object" && sizeData?.variants) {
          Object.keys(sizeData.variants).forEach((v) => variantSet.add(v));
        }
      });
    }
    // Add newly added variants
    addedVariants.forEach((v) => variantSet.add(v));
    return Array.from(variantSet);
  };

  const allVariants = getAllVariants();
  const hasVariants = allVariants.length > 0;

  // Get current variant quantity for a size
  const getVariantCurrentQty = (size, variant) => {
    const variants = getSizeVariants(size);
    if (variants && variants[variant]) {
      return variants[variant].quantity || 0;
    }
    return 0;
  };

  useEffect(() => {
    if (visible && product) {
      setSelectedSizes([]);
      setSizeQuantities({});
      setVariantQuantities({});
      setQuantity("");
      setReason("Restock");
      setOtherReason("");
      setNewVariantInputs({});
      setAddedVariants([]);
    }
  }, [visible, product]);

  if (!visible || !product) return null;

  const toggleSize = (size) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes((prev) => prev.filter((s) => s !== size));
      const newQuantities = { ...sizeQuantities };
      delete newQuantities[size];
      setSizeQuantities(newQuantities);
      const newVariantQtys = { ...variantQuantities };
      delete newVariantQtys[size];
      setVariantQuantities(newVariantQtys);
    } else {
      setSelectedSizes((prev) => [...prev, size]);
      setSizeQuantities((prev) => ({ ...prev, [size]: "" }));
      if (hasVariants) {
        setVariantQuantities((prev) => ({ ...prev, [size]: {} }));
      }
    }
  };

  const handleQuantityChange = (size, qty) => {
    const numericQty = qty.replace(/[^0-9]/g, "");
    setSizeQuantities((prev) => ({
      ...prev,
      [size]: numericQty ? parseInt(numericQty) : "",
    }));
  };

  const handleVariantQuantityChange = (size, variant, qty) => {
    const numericQty = qty.replace(/[^0-9]/g, "");
    setVariantQuantities((prev) => ({
      ...prev,
      [size]: {
        ...(prev[size] || {}),
        [variant]: numericQty ? parseInt(numericQty) : "",
      },
    }));
  };

  const handleNewVariantInputChange = (size, value) => {
    setNewVariantInputs((prev) => ({
      ...prev,
      [size]: value,
    }));
  };

  const handleAddNewVariant = (size) => {
    const variantName = (newVariantInputs[size] || "").trim();
    if (!variantName) {
      Alert.alert("Error", "Please enter a variant name");
      return;
    }
    if (allVariants.includes(variantName)) {
      Alert.alert("Error", "This variant already exists");
      return;
    }
    setAddedVariants((prev) => [...prev, variantName]);
    setNewVariantInputs((prev) => ({
      ...prev,
      [size]: "",
    }));
  };

  const handleSubmit = () => {
    if (reason === "Other" && !otherReason.trim()) {
      Alert.alert("Error", "Please specify the reason");
      return;
    }

    const finalReason =
      reason === "Other" ? `Other: ${otherReason.trim()}` : reason;

    if (!hasSizes) {
      // Product without sizes - simple quantity
      const qty = parseInt(quantity) || 0;
      if (qty <= 0) {
        Alert.alert("Error", "Please enter a valid quantity");
        return;
      }
      onConfirm({
        quantity: qty,
        noSizes: true,
        reason: finalReason,
      });
      return;
    }

    // Product with sizes
    if (selectedSizes.length === 0) {
      Alert.alert("Error", "Please select at least one size");
      return;
    }

    // Check if product has variants - validate variant quantities
    if (hasVariants) {
      const hasValidVariantQuantities = selectedSizes.some((size) => {
        const sizeVariantQtys = variantQuantities[size] || {};
        return Object.values(sizeVariantQtys).some((qty) => qty > 0);
      });

      if (!hasValidVariantQuantities) {
        Alert.alert("Error", "Please enter quantities for at least one variant");
        return;
      }

      onConfirm({
        sizes: sizeQuantities,
        variantQuantities: variantQuantities,
        selectedSizes: selectedSizes,
        reason: finalReason,
        hasVariants: true,
      });
      return;
    }

    // Product with sizes but no variants
    const hasValidQuantities = selectedSizes.some((size) => {
      const qty = sizeQuantities[size];
      return typeof qty === "number" && qty > 0;
    });

    if (!hasValidQuantities) {
      Alert.alert(
        "Error",
        "Please enter quantities for at least one selected size",
      );
      return;
    }

    const finalQuantities = {};
    selectedSizes.forEach((size) => {
      if (sizeQuantities[size]) {
        finalQuantities[size] = parseInt(sizeQuantities[size]);
      }
    });

    onConfirm({
      sizes: finalQuantities,
      selectedSizes: selectedSizes,
      reason: finalReason,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleContainer}>
              <View
                style={[styles.iconContainer, { backgroundColor: "#2ecc71" }]}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </View>
              <Text style={styles.modalTitle}>Stock In</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Product Info */}
            <View style={styles.productInfo}>
              {product.itemImage ? (
                <Image
                  source={{ uri: product.itemImage }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.productImage, styles.placeholderImage]}>
                  <Ionicons name="image-outline" size={40} color="#ccc" />
                </View>
              )}
              <View style={styles.productDetails}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSku}>SKU: {product.sku || "-"}</Text>
                <Text style={styles.productBrand}>
                  {product.brand || "No Brand"}
                </Text>
              </View>
            </View>

            {/* Sizes Selection or Simple Quantity */}
            {hasSizes ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Select Sizes</Text>
                  <View style={styles.sizesGrid}>
                    {allSizes.map((size) => {
                      const currentQty =
                        hasSizes && product.sizes[size]
                          ? getSizeQuantity(product.sizes[size])
                          : 0;
                      const isSelected = selectedSizes.includes(size);

                      return (
                        <TouchableOpacity
                          key={size}
                          style={[
                            styles.sizeChip,
                            isSelected && styles.sizeChipSelected,
                          ]}
                          onPress={() => toggleSize(size)}
                        >
                          <Text
                            style={[
                              styles.sizeChipText,
                              isSelected && styles.sizeChipTextSelected,
                            ]}
                          >
                            {size}
                          </Text>
                          <Text
                            style={[
                              styles.sizeChipStock,
                              isSelected && styles.sizeChipTextSelected,
                            ]}
                          >
                            ({currentQty})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {selectedSizes.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      {hasVariants ? "Quantity per Variant" : "Quantity per Size"}
                    </Text>
                    {selectedSizes.map((size) => {
                      const currentQty =
                        hasSizes && product.sizes[size]
                          ? getSizeQuantity(product.sizes[size])
                          : 0;

                      // If product has variants, show variant inputs
                      if (hasVariants) {
                        return (
                          <View key={size} style={styles.variantSizeContainer}>
                            <Text style={styles.variantSizeTitle}>
                              {size} <Text style={styles.variantSizeStock}>(Current: {currentQty})</Text>
                            </Text>
                            <View style={styles.variantGrid}>
                              {allVariants.map((variant) => {
                                const currentVariantQty = getVariantCurrentQty(size, variant);
                                const isNewVariant = addedVariants.includes(variant);
                                return (
                                  <View key={`${size}-${variant}`} style={styles.variantInputContainer}>
                                    <Text style={styles.variantLabel}>
                                      {variant}{" "}
                                      {isNewVariant ? (
                                        <Text style={styles.newVariantTag}>(New)</Text>
                                      ) : (
                                        <Text style={styles.variantStock}>({currentVariantQty})</Text>
                                      )}
                                    </Text>
                                    <TextInput
                                      style={styles.variantInput}
                                      value={variantQuantities[size]?.[variant]?.toString() || ""}
                                      onChangeText={(text) =>
                                        handleVariantQuantityChange(size, variant, text)
                                      }
                                      placeholder="0"
                                      keyboardType="numeric"
                                    />
                                  </View>
                                );
                              })}
                            </View>
                            {/* Add New Variant */}
                            <View style={styles.addVariantRow}>
                              <TextInput
                                style={styles.addVariantInput}
                                value={newVariantInputs[size] || ""}
                                onChangeText={(text) => handleNewVariantInputChange(size, text)}
                                placeholder="Add new variant..."
                              />
                              <TouchableOpacity
                                style={styles.addVariantButton}
                                onPress={() => handleAddNewVariant(size)}
                              >
                                <Ionicons name="add" size={20} color="#fff" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      }

                      // No variants - show simple quantity input with option to add variant
                      return (
                        <View key={size} style={styles.quantityRowContainer}>
                          <View style={styles.quantityRow}>
                            <Text style={styles.quantityLabel}>{size}</Text>
                            <TextInput
                              style={styles.quantityInput}
                              value={sizeQuantities[size]?.toString() || ""}
                              onChangeText={(text) =>
                                handleQuantityChange(size, text)
                              }
                              placeholder="0"
                              keyboardType="numeric"
                            />
                          </View>
                          {/* Option to add variant */}
                          <View style={styles.addVariantRow}>
                            <TextInput
                              style={styles.addVariantInput}
                              value={newVariantInputs[size] || ""}
                              onChangeText={(text) => handleNewVariantInputChange(size, text)}
                              placeholder="Add variant (e.g. Blue)"
                            />
                            <TouchableOpacity
                              style={styles.addVariantButton}
                              onPress={() => handleAddNewVariant(size)}
                            >
                              <Ionicons name="add" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quantity to Add</Text>
                <Text style={styles.currentStockText}>
                  Current Stock: {product.currentStock || 0}
                </Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={(text) =>
                    setQuantity(text.replace(/[^0-9]/g, ""))
                  }
                  placeholder="Enter quantity to add"
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Reason */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reason</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={reason}
                  onValueChange={(itemValue) => setReason(itemValue)}
                >
                  {reasons.map((r) => (
                    <Picker.Item key={r} label={r} value={r} />
                  ))}
                </Picker>
              </View>

              {reason === "Other" && (
                <TextInput
                  style={styles.input}
                  value={otherReason}
                  onChangeText={setOtherReason}
                  placeholder="Specify reason"
                />
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Add Stocks</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  productDetails: {
    marginLeft: 16,
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  productSku: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 14,
    color: "#888",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  sizesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sizeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    minWidth: 70,
    alignItems: "center",
  },
  sizeChipSelected: {
    backgroundColor: "#2ecc71",
    borderColor: "#2ecc71",
  },
  sizeChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  sizeChipTextSelected: {
    color: "#fff",
  },
  sizeChipStock: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  quantityRowContainer: {
    marginBottom: 16,
  },
  quantityLabel: {
    width: 60,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  quantityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  // Variant styles
  variantSizeContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  variantSizeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  variantSizeStock: {
    fontSize: 14,
    fontWeight: "400",
    color: "#888",
  },
  variantGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  variantInputContainer: {
    width: "48%",
    marginBottom: 8,
  },
  variantLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
  },
  variantStock: {
    fontSize: 12,
    color: "#888",
  },
  newVariantTag: {
    fontSize: 12,
    color: "#2ecc71",
    fontWeight: "600",
  },
  variantInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  addVariantRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  addVariantInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: "#fff",
  },
  addVariantButton: {
    backgroundColor: "#2ecc71",
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  currentStockText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  confirmButton: {
    backgroundColor: "#2ecc71",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default StockInModal;
