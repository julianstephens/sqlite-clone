import {
  COMMAND_STATUS,
  COMMAND_TYPE,
  EXECUTE_STATUS,
  SQL_STATEMENT_TYPE,
} from "@/utils";

type EnumExtract<T> = T[keyof T];

type GrowToSize<T, N extends number, A extends T[]> = A["length"] extends N
  ? A
  : GrowToSize<T, N, [...A, T]>;

export type FixedArray<T, N extends number> = GrowToSize<T, N, []>;

export type Primitive = string | number | boolean;

export type CommandStatus = EnumExtract<typeof COMMAND_STATUS>;

export type SqlStatementType = EnumExtract<typeof SQL_STATEMENT_TYPE>;

export type CommandType = EnumExtract<typeof COMMAND_TYPE>;

export type ExecuteStatus = EnumExtract<typeof EXECUTE_STATUS>;

export type ExecuteErrorStatus = Omit<ExecuteStatus, "success" | "ready">;

export type Row = {
  id: FixedArray<string, 4>;
  username: FixedArray<string, 32>;
  email: FixedArray<string, 255>;
};

export type Table = {
  rowsPerPage: number;
  numRows: number;
  pages: FixedArray<Buffer | null, 100>;
};

export type SqlStatement = {
  type: SqlStatementType;
  command?: string;
  row?: Row;
};

export type ExecuteStatement = Required<SqlStatement>;

export type ExecuteError = {
  status: ExecuteErrorStatus;
  message?: string;
};