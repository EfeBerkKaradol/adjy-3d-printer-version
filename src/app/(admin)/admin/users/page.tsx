"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const roleLabels: Record<string, string> = {
  USER: "Kullanıcı",
  ADMIN: "Admin",
  SELLER: "Satıcı",
};

const roleColors: Record<string, string> = {
  USER: "bg-blue-500/10 text-blue-500",
  ADMIN: "bg-red-500/10 text-red-500",
  SELLER: "bg-green-500/10 text-green-500",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [roleFilter, setRoleFilter] = useState(
    searchParams.get("role") || "ALL"
  );
  const page = parseInt(searchParams.get("page") || "1");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch {
      // Hata
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (
    userId: string,
    data: { role?: string; isActive?: boolean }
  ) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, ...data } : u))
        );
      }
    } catch {
      // Hata
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    router.push(`/admin/users?${params}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kullanıcıları görüntüleyin, rol atayın ve hesapları yönetin
        </p>
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Email veya ad soyad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Ara
          </Button>
        </form>

        <Select
          value={roleFilter}
          onValueChange={(val) => {
            setRoleFilter(val);
            const params = new URLSearchParams();
            if (val !== "ALL") params.set("role", val);
            if (search) params.set("search", search);
            router.push(`/admin/users?${params}`);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tümü</SelectItem>
            <SelectItem value="USER">Kullanıcı</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="SELLER">Satıcı</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Kullanıcı
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Rol
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    Sipariş
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Kayıt
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    Durum
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Kullanıcı bulunamadı
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">
                            {user.fullName || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={user.role}
                          onValueChange={(val) =>
                            updateUser(user.id, { role: val })
                          }
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">Kullanıcı</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="SELLER">Satıcı</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.orderCount}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.isActive ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500 font-medium">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500 font-medium">
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateUser(user.id, {
                              isActive: !user.isActive,
                            })
                          }
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4 text-red-500" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Toplam {pagination.total} kullanıcı
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => router.push(`/admin/users?page=${page - 1}`)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => router.push(`/admin/users?page=${page + 1}`)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
