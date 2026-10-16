export class MemoryRepository<T> {
  private value: T;

  constructor(
    initialValue: T
  ) {
    this.value = initialValue;
  }

  get(): T {
    return structuredClone(
      this.value
    );
  }

  set(
    value: T
  ): void {
    this.value =
      structuredClone(value);
  }

  reset(
    value: T
  ): void {
    this.value =
      structuredClone(value);
  }
}