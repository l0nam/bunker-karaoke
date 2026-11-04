// Ошибка, которую мы сами выбрасываем при неверных данных. Превращается в ответ 400.
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
