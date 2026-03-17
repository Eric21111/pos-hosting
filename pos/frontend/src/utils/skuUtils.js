/**
 * Generates a dynamic SKU string by appending formatted variant and size abbreviations to a base SKU.
 * Format: [Base SKU]-[Variant Initials]-[Size Initials]
 * Example: SKU-1234-WH-S
 *
 * @param {string} baseSku - The original product SKU
 * @param {string} variantName - The selected variant name (optional)
 * @param {string} sizeName - The selected size name (optional)
 * @returns {string} The formatted dynamic SKU
 */
export const generateDynamicSku = (baseSku, variantName, sizeName) => {
    let sku = baseSku || "N/A";
    if (sku === "N/A" || (!variantName && !sizeName)) return sku;

    let suffix = "";
    if (variantName) {
        // Append first two letters of variant in UPPERCASE (e.g., 'White' -> 'WH')
        suffix += `-${variantName.substring(0, 2).toUpperCase()}`;
    }

    if (sizeName) {
        // Special case for 'Free Size', otherwise first two letters in UPPERCASE
        const sizeInitial = sizeName === "Free Size" ? "FS" : sizeName.substring(0, 2).toUpperCase();
        suffix += `-${sizeInitial}`;
    }

    return `${sku}${suffix}`;
};
