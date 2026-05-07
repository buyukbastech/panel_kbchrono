import { z } from "zod";
import { supabase } from "./supabase";

const createProductSchema = z.object({
  name: z.string(),
  collection: z.string(),
  description: z.string(),
  price: z.string(),
  sku: z.string(),
  images: z.array(z.string()).optional(),
  movement: z.string().optional(),
  case_material: z.string().optional(),
  case_size: z.string().optional(),
  water_resistance: z.string().optional(),
  power_reserve: z.string().optional(),
  crystal: z.string().optional(),
  status: z.string().optional().default('taslak'),
  translations: z.record(z.any()).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export interface WatchProduct extends CreateProductInput {
  image: string;
  tagline: string;
}

export const getProductsServerFn = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return { success: false, error: error.message };
  }
};

export const createProductServerFn = async (input: { data: CreateProductInput }) => {
  const { data } = input;
  try {
    const mainImage = data.images && data.images.length > 0 ? data.images[0] : "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&q=80&w=800";
    
    const { error } = await supabase
      .from('products')
      .insert([{
        name: data.name,
        collection: data.collection,
        description: data.description,
        price: data.price,
        sku: data.sku,
        image: mainImage,
        images: data.images || [],
        movement: data.movement,
        case_material: data.case_material,
        case_size: data.case_size,
        water_resistance: data.water_resistance,
        power_reserve: data.power_reserve,
        crystal: data.crystal,
        status: data.status,
        translations: data.translations || {},
        tagline: "Atölyemizden yeni bir başyapıt",
        slug: data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
      }]);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { success: false, error: error.message || "Failed to update database" };
  }
};

export const updateProductStatusServerFn = async (input: { data: { id: string, status: string } }) => {
  const { data } = input;
  try {
    const { error } = await supabase
      .from('products')
      .update({ status: data.status })
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Error updating status:", error);
    return { success: false, error: error.message };
  }
};

export const updateProductServerFn = async (input: { data: { id: string, data: CreateProductInput } }) => {
  const { data: { id, data } } = input;
  try {
    // Get current images to preserve them if no new images uploaded
    const { data: currentProduct } = await supabase
      .from('products')
      .select('image, images')
      .eq('id', id)
      .single();

    const mainImage = data.images && data.images.length > 0 ? data.images[0] : currentProduct?.image;
    const images = data.images && data.images.length > 0 ? data.images : currentProduct?.images;

    const { error } = await supabase
      .from('products')
      .update({
        name: data.name,
        collection: data.collection,
        description: data.description,
        price: data.price,
        sku: data.sku,
        image: mainImage,
        images: images,
        movement: data.movement,
        case_material: data.case_material,
        case_size: data.case_size,
        water_resistance: data.water_resistance,
        power_reserve: data.power_reserve,
        crystal: data.crystal,
        status: data.status,
        translations: data.translations || {},
        slug: data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Error updating product:", error);
    return { success: false, error: error.message };
  }
};

export const deleteProductServerFn = async (input: { data: { id: string } }) => {
  const { data } = input;
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message };
  }
};

