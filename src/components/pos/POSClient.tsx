"use client";

import { useState } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function POSClient({ initialProducts, branchId, userId }: any) {
  const [products] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const { toast } = useToast();

  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: any, isLiquidMl: boolean = false) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id && item.isLiquidMl === isLiquidMl);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.isLiquidMl === isLiquidMl
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      const price = isLiquidMl ? product.pricePerMl : (product.salePrice || product.bottleSalePrice);
      
      return [...prev, {
        productId: product.id,
        name: product.name,
        price,
        quantity: 1,
        isLiquidMl,
        productType: product.productType
      }];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      newCart[index].quantity += delta;
      if (newCart[index].quantity <= 0) {
        newCart.splice(index, 1);
      }
      return newCart;
    });
  };

  const remove = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="flex h-[calc(100vh-64px)] lg:h-screen">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col bg-gray-50 border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-lg"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p: any) => (
              <div key={p.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-violet-300 transition flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{p.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{p.category?.name}</p>
                </div>
                <div className="mt-4 space-y-2">
                  {p.productType === 'LIQUID' ? (
                    <>
                      <button 
                        onClick={() => addToCart(p, false)}
                        className="w-full py-2 bg-violet-50 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-100"
                      >
                        Bottle: Rs {p.bottleSalePrice}
                      </button>
                      <button 
                        onClick={() => addToCart(p, true)}
                        className="w-full py-2 border border-violet-200 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-50"
                      >
                        1 ML: Rs {p.pricePerMl}
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => addToCart(p, false)}
                      className="w-full py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
                    >
                      Add - Rs {p.salePrice}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-96 bg-white flex flex-col shadow-xl z-10">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-violet-600" />
          <h2 className="font-bold text-gray-900 text-lg">Current Sale</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 border border-gray-100 rounded-xl bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-500">
                    Rs {item.price} {item.isLiquidMl ? '(per ML)' : ''}
                  </p>
                </div>
                <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1">
                  <button onClick={() => updateQuantity(i, -1)} className="p-1 hover:bg-gray-100 rounded">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(i, 1)} className="p-1 hover:bg-gray-100 rounded">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="font-bold text-gray-900">Rs {item.price * item.quantity}</span>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
              <p>Cart is empty</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Total</span>
            <span>Rs {subtotal}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => {
              toast({ title: "Success", description: "Sale completed!" });
              setCart([]);
            }}
            className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold text-lg hover:bg-violet-700 disabled:opacity-50"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}