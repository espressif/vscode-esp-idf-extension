export class SerialPortDetails {
    public comName: string;
    public manufacturer: string;
    public vendorId: string;
    public productId: string;

    constructor(comName: string, manufacturer?: string, vendorId?: string, product?: string) {
        this.comName = comName;
        this.manufacturer = manufacturer;
        this.vendorId = vendorId;
        this.productId = product;
    }
}
