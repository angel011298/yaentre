import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';

/**
 * Búsqueda de la pestaña Usuarios. Es un `<form method="get">` deliberadamente
 * SIN JavaScript: la consulta la resuelve el servidor (RSC) leyendo
 * `searchParams`, así que no hace falta estado de cliente, y la URL resultante
 * es compartible y navegable con el historial del navegador.
 */
export function UserSearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form method="get" action="/admin/usuarios" className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <TextField
          name="q"
          label="Buscar"
          type="search"
          defaultValue={defaultValue}
          placeholder="correo@ejemplo.com o nombre"
        />
      </div>
      <Button type="submit" variant="secondary">
        Buscar
      </Button>
    </form>
  );
}
