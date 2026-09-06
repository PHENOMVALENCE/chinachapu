export type RequestKind = "catalogue" | "custom";

export type RequestLine = {
  clientId: string;
  kind: RequestKind;
  productId?: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  description?: string;
  imageName?: string;
  imagePreview?: string;
  uploadId?: string;
  uploadError?: string;
};

export const REQUEST_DRAFT_KEY = "cc-request-draft-v1";
export const LEGACY_CART_KEY = "cart";
