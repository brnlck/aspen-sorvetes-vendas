export type Vendor = {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  address: string;
  status: 'Ativo' | 'Inativo';
  photo?: string; // base64 data URL
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  priceFactory: number;
  profitVendor: number;
  status: 'Ativo' | 'Inativo';
  sortOrder?: number;
};

export type ComandaItem = {
  id: string;
  productId: string;
  quantityOut: number;          // Saída Inicial (manhã)
  quantityReposition: number;   // Reposição durante o dia
  quantityReturn: number;       // Retorno tarde
  priceFactoryFrozen: number;
  profitVendorFrozen: number;
};

export type PaymentMethod = 'Dinheiro' | 'PIX' | 'Crédito' | 'Débito';

export type Payment = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

export type ComandaStatus = 'Aberta' | 'Fechada';

export type Comanda = {
  id: string;
  vendorId: string;
  date: string; // YYYY-MM-DD
  status: ComandaStatus;
  items: ComandaItem[];
  discount: number;
  payments: Payment[];
  createdAt: string;
  closedAt?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
};
