export type ActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  code?: 'DUPLICATE_EMAIL';
  fieldErrors?: Record<string, string[]>;
};

export const initialActionState: ActionState = { status: 'idle' };
