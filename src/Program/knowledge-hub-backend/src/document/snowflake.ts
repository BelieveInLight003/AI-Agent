/** 时间有序的雪花 ID，结果是递增的 bigint 字符串 */
export class Snowflake {
  private sequence = 0n;
  private lastTimestamp = -1n;
  private readonly workerId: bigint;
  private readonly epoch = 1704067200000n;

  constructor(workerId = 1n) {
    this.workerId = workerId & 1023n;
  }

  nextId(): string {
    let timestamp = BigInt(Date.now());
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & 4095n;
      if (this.sequence === 0n) {
        while (timestamp <= this.lastTimestamp) {
          timestamp = BigInt(Date.now());
        }
      }
    } else {
      this.sequence = 0n;
    }
    this.lastTimestamp = timestamp;
    const id =
      ((timestamp - this.epoch) << 22n) |
      (this.workerId << 12n) |
      this.sequence;
    return id.toString();
  }
}
