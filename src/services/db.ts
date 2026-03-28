import type { Vendor, Product, Comanda } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Constants for initial data seeding
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
  private get<T>(key: string): T[] {
    const data = localStorage.getItem(`ice_cream_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private set<T>(key: string, data: T[]) {
    localStorage.setItem(`ice_cream_${key}`, JSON.stringify(data));
  }

  // ---- VENDORS ----
  getVendors(): Vendor[] {
    return this.get<Vendor>('vendors');
  }

  saveVendor(vendorData: Omit<Vendor, 'id' | 'createdAt'>): Vendor {
    const vendors = this.getVendors();
    const newVendor: Vendor = {
      ...vendorData,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    this.set('vendors', [...vendors, newVendor]);
    return newVendor;
  }

  updateVendor(id: string, vendorData: Partial<Vendor>): Vendor | null {
    const vendors = this.getVendors();
    const index = vendors.findIndex(v => v.id === id);
    if (index === -1) return null;
    vendors[index] = { ...vendors[index], ...vendorData };
    this.set('vendors', vendors);
    return vendors[index];
  }

  // ---- PRODUCTS ----
  getProducts(): Product[] {
    let products = this.get<Product>('products');
    if (products.length === 0) {
      products = INITIAL_PRODUCTS.map(p => ({ ...p, id: uuidv4() }));
      this.set('products', products);
    }
    return products;
  }

  saveProduct(product: Omit<Product, 'id'>): Product {
    const products = this.getProducts();
    const newProduct: Product = { ...product, id: uuidv4() };
    this.set('products', [...products, newProduct]);
    return newProduct;
  }

  updateProduct(id: string, productData: Partial<Product>): Product | null {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...productData };
    this.set('products', products);
    return products[index];
  }

  // ---- COMANDAS ----
  getComandas(): Comanda[] {
    const raw = this.get<Comanda>('comandas');
    // Backward compat: ensure new fields exist on old records
    return raw.map(c => ({
      ...c,
      items: c.items.map(item => ({
        ...item,
        quantityReposition: item.quantityReposition ?? 0,
      })),
    }));
  }

  getComandaById(id: string): Comanda | undefined {
    return this.getComandas().find(c => c.id === id);
  }

  saveComanda(comanda: Omit<Comanda, 'id' | 'createdAt'>): Comanda {
    const comandas = this.getComandas();
    const newComanda: Comanda = {
      ...comanda,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    this.set('comandas', [...comandas, newComanda]);
    return newComanda;
  }

  updateComanda(id: string, comandaData: Partial<Comanda>): Comanda | null {
    const comandas = this.getComandas();
    const index = comandas.findIndex(c => c.id === id);
    if (index === -1) return null;
    comandas[index] = { ...comandas[index], ...comandaData };
    this.set('comandas', comandas);
    return comandas[index];
  }

  // ---- UTILS ----
  clearAll() {
    localStorage.clear();
  }
}

export const db = new DBService();
