// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SupplyChain
 * @notice Minimal supply-chain tracking contract for the COMP842 group project MVP.
 *
 * Design notes (frozen — see 01_Claude_Code_Handoff.md):
 *
 *  - Two conceptual layers:
 *      1. `Product` stores the *mutable current state* of a single product / shipment.
 *      2. Historical supply-chain records are *append-only blockchain event logs*.
 *
 *  - No function can modify or delete an already emitted event. The complete audit
 *    trail is reconstructed off-chain from the ordered event stream (via
 *    `queryFilter`), not from the current `Product` struct. This is not a claim
 *    that "nothing is ever updated" — the current status field is updated in place.
 *
 *  - There is intentionally NO on-chain `HistoryRecord[]` array.
 *
 *  - Write permissioning is application-layer only, using OpenZeppelin
 *    `AccessControl`. On a public network (e.g. Sepolia) the product state and the
 *    event logs remain publicly observable. `AccessControl` restricts
 *    state-changing functions only; it is not a read-confidentiality control.
 *
 *  - Scope: one product = one shipment = one tracking number. No partial
 *    shipments, no multi-leg transport. `Status.Delivered` is terminal.
 *
 *  - `productId` is the internal identifier used by every function. The
 *    human-facing tracking number (e.g. TRK-2026-000001) is assigned once, by
 *    `createProduct`, from an on-chain sequence and never changes afterwards.
 */
contract SupplyChain is AccessControl {
    // ---------------------------------------------------------------------
    // Roles
    // ---------------------------------------------------------------------

    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant WAREHOUSE_ROLE = keccak256("WAREHOUSE_ROLE");
    bytes32 public constant TRANSPORT_ROLE = keccak256("TRANSPORT_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");

    // ---------------------------------------------------------------------
    // Data model
    // ---------------------------------------------------------------------

    /// @notice Supply-chain lifecycle states. `Delivered` is terminal.
    enum Status {
        Created,
        InWarehouse,
        DispatchedFromWarehouse,
        PickedUp,
        InTransit,
        Delivered
    }

    /// @notice Mutable current state of a single product / shipment.
    struct Product {
        uint256 productId;
        string name;
        uint256 quantity;
        address supplier;
        address destinationRetailer;
        address assignedTransport;
        uint256 createdAt;
        Status currentStatus;
        string trackingNumber;
    }

    /// @dev `products` is private for API encapsulation only — NOT confidentiality.
    mapping(uint256 => Product) private products;
    mapping(uint256 => bool) private productExists;
    mapping(bytes32 => uint256) private productIdByTrackingHash;
    mapping(bytes32 => bool) private trackingNumberUsed;
    mapping(address => string) public businessNames;
    struct Driver { string driverId; string name; address transport; }
    mapping(bytes32 => Driver) private drivers;
    mapping(address => bytes32[]) private driverIdsByTransport;
    /// @notice Contract-wide sequence used to assign unique internal driver IDs.
    uint256 public driverCount;

    /// @notice Number of shipments created; the next shipment's tracking sequence is `shipmentCount + 1`.
    uint256 public shipmentCount;

    /// @dev Fixed demo year: calendar conversion from `block.timestamp` is out of scope for this MVP.
    string private constant TRACKING_PREFIX = "TRK-2026-";
    uint256 private constant TRACKING_DIGITS = 6;

    // ---------------------------------------------------------------------
    // Events — append-only historical audit trail
    // ---------------------------------------------------------------------

    event ProductCreated(
        uint256 indexed productId,
        address indexed supplier,
        address indexed destinationRetailer,
        string name,
        uint256 quantity,
        string trackingNumber,
        uint256 timestamp
    );

    event WarehouseEntry(
        uint256 indexed productId,
        address indexed staff,
        string warehouseId,
        uint256 quantity,
        uint256 timestamp
    );

    // NOTE: WarehouseExit intentionally has NO warehouseId parameter.
    event WarehouseExit(
        uint256 indexed productId,
        address indexed staff,
        address indexed assignedTransport,
        uint256 quantity,
        uint256 timestamp
    );

    event TransportPickup(
        uint256 indexed productId,
        address indexed transportCompany,
        string trackingNumber,
        string driverId,
        uint256 timestamp
    );

    event TransportStatusUpdated(
        uint256 indexed productId,
        string trackingNumber,
        string location,
        Status status,
        uint256 timestamp
    );

    event GoodsDelivered(
        uint256 indexed productId,
        address indexed retailer,
        string shopId,
        uint256 quantity,
        uint256 timestamp
    );
    event BusinessNameSet(address indexed account, string name);
    event DriverRegistered(address indexed transport, string driverId, string name);

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setBusinessName(address account, string calldata name) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Account required");
        require(bytes(name).length > 0, "Business name required");
        businessNames[account] = name;
        emit BusinessNameSet(account, name);
    }

    function registerDriver(string calldata name) external onlyRole(TRANSPORT_ROLE) {
        require(bytes(name).length > 0, "Driver name required");
        string memory driverId = string.concat("DRV-", Strings.toString(++driverCount));
        bytes32 key = keccak256(bytes(driverId));
        drivers[key] = Driver(driverId, name, msg.sender);
        driverIdsByTransport[msg.sender].push(key);
        emit DriverRegistered(msg.sender, driverId, name);
    }

    function getDrivers(address transport) external view returns (Driver[] memory result) {
        bytes32[] storage ids = driverIdsByTransport[transport];
        result = new Driver[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = drivers[ids[i]];
    }

    function getDriver(string calldata driverId) external view returns (Driver memory) {
        return drivers[keccak256(bytes(driverId))];
    }

    // ---------------------------------------------------------------------
    // State-changing functions
    // ---------------------------------------------------------------------

    /**
     * @notice Supplier registers a new product / shipment and receives its tracking number.
     * @dev Role: SUPPLIER_ROLE. The tracking number comes from the on-chain sequence,
     *      so it is unique without any caller input.
     */
    function createProduct(
        uint256 productId,
        string calldata name,
        uint256 quantity,
        address destinationRetailer
    ) external onlyRole(SUPPLIER_ROLE) {
        require(!productExists[productId], "Product already exists");
        require(quantity > 0, "Quantity must be greater than zero");
        require(bytes(name).length > 0, "Name required");
        require(destinationRetailer != address(0), "Destination retailer required");
        require(hasRole(RETAILER_ROLE, destinationRetailer), "Destination retailer lacks role");

        shipmentCount += 1;
        string memory trackingNumber = _formatTrackingNumber(shipmentCount);
        bytes32 trackingHash = keccak256(bytes(trackingNumber));

        products[productId] = Product({
            productId: productId,
            name: name,
            quantity: quantity,
            supplier: msg.sender,
            destinationRetailer: destinationRetailer,
            assignedTransport: address(0),
            createdAt: block.timestamp,
            currentStatus: Status.Created,
            trackingNumber: trackingNumber
        });
        productExists[productId] = true;
        trackingNumberUsed[trackingHash] = true;
        productIdByTrackingHash[trackingHash] = productId;

        emit ProductCreated(productId, msg.sender, destinationRetailer, name, quantity, trackingNumber, block.timestamp);
    }

    /**
     * @notice Warehouse staff records goods arriving at a warehouse.
     * @dev Role: WAREHOUSE_ROLE. Requires current status == Created and a full
     *      quantity match against the stored product quantity.
     */
    function recordWarehouseEntry(
        uint256 productId,
        string calldata warehouseId,
        uint256 quantity
    ) external onlyRole(WAREHOUSE_ROLE) {
        require(productExists[productId], "Product does not exist");
        Product storage product = products[productId];
        require(product.currentStatus == Status.Created, "Invalid status for warehouse entry");
        require(quantity == product.quantity, "Quantity mismatch");
        require(bytes(warehouseId).length > 0, "Warehouse ID required");

        product.currentStatus = Status.InWarehouse;

        emit WarehouseEntry(productId, msg.sender, warehouseId, quantity, block.timestamp);
    }

    /**
     * @notice Warehouse staff records goods leaving the warehouse.
     * @dev Role: WAREHOUSE_ROLE. No warehouseId / quantity are re-supplied — the
     *      stored product quantity is emitted.
     */
    function recordWarehouseExit(uint256 productId, address assignedTransport) external onlyRole(WAREHOUSE_ROLE) {
        require(productExists[productId], "Product does not exist");
        Product storage product = products[productId];
        require(product.currentStatus == Status.InWarehouse, "Invalid status for warehouse exit");
        require(assignedTransport != address(0), "Assigned transport required");
        require(hasRole(TRANSPORT_ROLE, assignedTransport), "Assigned transport lacks role");

        product.assignedTransport = assignedTransport;
        product.currentStatus = Status.DispatchedFromWarehouse;

        emit WarehouseExit(productId, msg.sender, assignedTransport, product.quantity, block.timestamp);
    }

    /**
     * @notice Transport company records pickup of a dispatched shipment.
     * @dev Role: TRANSPORT_ROLE. The shipment keeps the tracking number assigned at creation.
     */
    function recordPickup(
        uint256 productId,
        string calldata driverId
    ) external onlyRole(TRANSPORT_ROLE) {
        require(productExists[productId], "Product does not exist");
        Product storage product = products[productId];
        require(
            product.currentStatus == Status.DispatchedFromWarehouse,
            "Invalid status for pickup"
        );
        require(msg.sender == product.assignedTransport, "Not assigned transport");
        require(bytes(driverId).length > 0, "Driver ID required");
        require(drivers[keccak256(bytes(driverId))].transport == msg.sender, "Driver not registered to transport");

        product.currentStatus = Status.PickedUp;

        emit TransportPickup(productId, msg.sender, product.trackingNumber, driverId, block.timestamp);
    }

    /**
     * @notice Transport company posts a location update while goods are moving.
     * @dev Role: TRANSPORT_ROLE. Status is hardcoded to `InTransit` — the caller
     *      cannot pass an arbitrary Status.
     */
    function updateTransportLocation(
        uint256 productId,
        string calldata location
    ) external onlyRole(TRANSPORT_ROLE) {
        require(productExists[productId], "Product does not exist");
        Product storage product = products[productId];
        require(
            product.currentStatus == Status.PickedUp || product.currentStatus == Status.InTransit,
            "Invalid status for location update"
        );
        require(msg.sender == product.assignedTransport, "Not assigned transport");
        require(bytes(location).length > 0, "Location required");

        product.currentStatus = Status.InTransit;

        emit TransportStatusUpdated(
            productId,
            product.trackingNumber,
            location,
            Status.InTransit,
            block.timestamp
        );
    }

    /**
     * @notice Retailer confirms delivery of the shipment. Terminal transition.
     * @dev Role: RETAILER_ROLE. Requires a full received-quantity match.
     */
    function confirmDelivery(
        uint256 productId,
        string calldata shopId,
        uint256 receivedQuantity
    ) external onlyRole(RETAILER_ROLE) {
        require(productExists[productId], "Product does not exist");
        Product storage product = products[productId];
        require(
            product.currentStatus == Status.PickedUp || product.currentStatus == Status.InTransit,
            "Invalid status for delivery"
        );
        require(msg.sender == product.destinationRetailer, "Not destination retailer");
        require(receivedQuantity == product.quantity, "Quantity mismatch");
        require(bytes(shopId).length > 0, "Shop ID required");

        product.currentStatus = Status.Delivered;

        emit GoodsDelivered(productId, msg.sender, shopId, receivedQuantity, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Formats a sequence as TRK-2026-000001; sequences beyond 999999 keep all their digits.
    function _formatTrackingNumber(uint256 sequence) private pure returns (string memory) {
        bytes memory digits = bytes(Strings.toString(sequence));
        bytes memory padding = new bytes(digits.length < TRACKING_DIGITS ? TRACKING_DIGITS - digits.length : 0);
        for (uint256 i = 0; i < padding.length; i++) padding[i] = "0";
        return string.concat(TRACKING_PREFIX, string(padding), string(digits));
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Returns the current stored state of a product.
    function getProduct(uint256 productId) external view returns (Product memory) {
        require(productExists[productId], "Product does not exist");
        return products[productId];
    }

    /// @notice Resolves a tracking number to its product ID.
    function getProductIdByTrackingNumber(
        string calldata trackingNumber
    ) external view returns (uint256) {
        require(bytes(trackingNumber).length > 0, "Tracking number required");
        bytes32 trackingHash = keccak256(bytes(trackingNumber));
        require(trackingNumberUsed[trackingHash], "Unknown tracking number");
        return productIdByTrackingHash[trackingHash];
    }
}
