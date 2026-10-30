export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isVerified?: boolean;
};

export type FoodCategory = { _id: string; name: string; image?: string | null };
export type FoodItem = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  image?: string | null;
  foodType?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  category?: FoodCategory | string | null;
};

export type Room = {
  _id: string;
  roomNumber?: string | number;
  floor?: string | number;
  price?: number;
  image?: string | null;
  roomType?: { name?: string; basePrice?: number; capacity?: number; amenities?: string[]; image?: string; images?: string[] } | null;
};
