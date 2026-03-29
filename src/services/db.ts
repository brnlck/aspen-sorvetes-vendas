/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Vendor, Product, Comanda } from '../types';
import { supabase } from './supabase';

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  { name: 'Base Leite', priceFactory: 2.50, profitVendor: 1.50, status: 'Ativo' },
  { name: 'Base Água', priceFactory: 2.30, profitVendor: 1.20, status: 'Ativo' },
  { name: 'Skimo', priceFactory: 4.30, profitVendor: 1.70, status: 'Ativo' },
  { name: 'Premium', priceFactory: 5.30, profitVendor: 2.70, status: 'Ativo' },
  { name: 'Sorvete', priceFactory: 5.00, profitVendor: 2.50, status: 'Ativo' },
  { name: 'Sorvete Premium', priceFactory: 5.50, profitVendor: 2.50, status: 'Ativo' },
  { name: 'Mini Paleta', priceFactory: 5.30, profitVendor: 2.70, status: 'Ativo' },
];

class DBService {
  // ---- VENDORS ----
  async getVendors(): Promise<Vendor[]> {
    const { data, error } = await supabase.from('vendors').select('*').order('name');
    if (error) throw error;
    return data || [];
  }

  async saveVendor(vendorData: Omit<Vendor, 'id' | 'createdAt'>): Promise<Vendor> {
    const { data, error } = await supabase.from('vendors').insert(vendorData).select().single();
    if (error) throw error;
    return data;
  }

  async updateVendor(id: string, vendorData: Partial<Vendor>): Promise<Vendor> {
    const { data, error } = await supabase.from('vendors').update(vendorData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  // ---- PRODUCTS ----
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw error;
    
    if (!data || data.length === 0) {
      // Seed initially
      const mapped = INITIAL_PRODUCTS.map(p => ({
        name: p.name,
        price_factory: p.priceFactory,
        profit_vendor: p.profitVendor,
        status: p.status,
      }));
      const { data: inserted, error: iErr } = await supabase.from('products').insert(mapped).select();
      if (iErr) throw iErr;
      return (inserted || []).map(this.mapProduct);
    }
    
    return data.map(this.mapProduct);
  }

  async saveProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const { data, error } = await supabase.from('products').insert({
      name: product.name,
      price_factory: product.priceFactory,
      profit_vendor: product.profitVendor,
      status: product.status,
    }).select().single();
    if (error) throw error;
    return this.mapProduct(data);
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    const payload: any = {};
    if (productData.name !== undefined) payload.name = productData.name;
    if (productData.priceFactory !== undefined) payload.price_factory = productData.priceFactory;
    if (productData.profitVendor !== undefined) payload.profit_vendor = productData.profitVendor;
    if (productData.status !== undefined) payload.status = productData.status;

    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return this.mapProduct(data);
  }

  private mapProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      priceFactory: Number(row.price_factory),
      profitVendor: Number(row.profit_vendor),
      status: row.status as 'Ativo'|'Inativo'
    };
  }

  // ---- COMANDAS ----
  async getComandas(): Promise<Comanda[]> {
    const { data, error } = await supabase.from('comandas').select(`
      *,
      items: comanda_items(*),
      payments: payments(*)
    `).order('date', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(this.mapComanda);
  }

  async getComandaById(id: string): Promise<Comanda | undefined> {
    const { data, error } = await supabase.from('comandas').select(`
      *,
      items: comanda_items(*),
      payments: payments(*)
    `).eq('id', id).single();
    
    if (error) return undefined;
    return this.mapComanda(data);
  }

  async saveComanda(comanda: Omit<Comanda, 'id' | 'createdAt'>): Promise<Comanda> {
    // 1. Insert Comanda
    const { data: cData, error: cErr } = await supabase.from('comandas').insert({
      vendor_id: comanda.vendorId,
      date: comanda.date,
      status: comanda.status,
      discount: comanda.discount,
      closed_at: comanda.closedAt
    }).select().single();
    if (cErr) throw cErr;

    // 2. Insert Items
    if (comanda.items && comanda.items.length > 0) {
      const itemsPayload = comanda.items.map(i => ({
        comanda_id: cData.id,
        product_id: i.productId,
        quantity_out: i.quantityOut,
        quantity_reposition: i.quantityReposition,
        quantity_return: i.quantityReturn,
        price_factory_frozen: i.priceFactoryFrozen,
        profit_vendor_frozen: i.profitVendorFrozen,
      }));
      const { error: iErr } = await supabase.from('comanda_items').insert(itemsPayload);
      if (iErr) throw iErr;
    }

    // 3. Insert Payments
    if (comanda.payments && comanda.payments.length > 0) {
       const payPayload = comanda.payments.map(p => ({
         comanda_id: cData.id,
         method: p.method,
         amount: p.amount
       }));
       const { error: pErr } = await supabase.from('payments').insert(payPayload);
       if (pErr) throw pErr;
    }

    return this.getComandaById(cData.id) as unknown as Comanda;
  }

  async updateComanda(id: string, comandaData: Partial<Comanda>): Promise<Comanda> {
    const cPayload: any = {};
    if (comandaData.vendorId !== undefined) cPayload.vendor_id = comandaData.vendorId;
    if (comandaData.date !== undefined) cPayload.date = comandaData.date;
    if (comandaData.status !== undefined) cPayload.status = comandaData.status;
    if (comandaData.discount !== undefined) cPayload.discount = comandaData.discount;
    if ('closedAt' in comandaData) cPayload.closed_at = comandaData.closedAt;

    // Rewrite items if provided
    if (comandaData.items) {
      await supabase.from('comanda_items').delete().eq('comanda_id', id);
      const itemsPayload = comandaData.items.map(i => ({
        comanda_id: id,
        product_id: i.productId,
        quantity_out: i.quantityOut,
        quantity_reposition: i.quantityReposition,
        quantity_return: i.quantityReturn,
        price_factory_frozen: i.priceFactoryFrozen,
        profit_vendor_frozen: i.profitVendorFrozen,
      }));
      await supabase.from('comanda_items').insert(itemsPayload);
    }

    // Rewrite payments if provided
    if (comandaData.payments) {
       await supabase.from('payments').delete().eq('comanda_id', id);
       if (comandaData.payments.length > 0) {
         const payPayload = comandaData.payments.map(p => ({
           comanda_id: id,
           method: p.method,
           amount: p.amount
         }));
         await supabase.from('payments').insert(payPayload);
       }
    }

    if (Object.keys(cPayload).length > 0) {
      const { error } = await supabase.from('comandas').update(cPayload).eq('id', id);
      if (error) throw error;
    }

    return this.getComandaById(id) as unknown as Comanda;
  }

  private mapComanda(row: any): Comanda {
    return {
      id: row.id,
      vendorId: row.vendor_id,
      date: row.date,
      status: row.status as any,
      discount: Number(row.discount),
      createdAt: row.created_at,
      closedAt: row.closed_at,
      items: (row.items || []).map((i: any) => ({
        id: i.id,
        productId: i.product_id,
        quantityOut: i.quantity_out,
        quantityReposition: i.quantity_reposition,
        quantityReturn: i.quantity_return,
        priceFactoryFrozen: Number(i.price_factory_frozen),
        profitVendorFrozen: Number(i.profit_vendor_frozen),
      })),
      payments: (row.payments || []).map((p: any) => ({
        id: p.id,
        method: p.method as any,
        amount: Number(p.amount)
      }))
    };
  }

  // ---- UTILS ----
  clearAll() {
    // No-op for Supabase migration
  }
}

export const db = new DBService();
