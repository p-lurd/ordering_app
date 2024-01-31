const Driver = require("./Driver");
const Order = require("./Order");
const Sender = require("./Sender");

class OrderingApp {
  constructor() {
    this.orders = [];
    this.drivers = [];
    this.senders = [];
    this.socketUserMap = new Map();
  }

  joinSession(socket) {
    const { name, id, user_type } = socket.handshake.query;
    if (user_type === "driver") {
      const driver = this.drivers.find((driver) => driver.id === id);
      if (driver) {
        this.assignSocket({ socket, user: driver });
        const driverOrders = this.orders.filter(
          (order) => order.driver !== null && order.driver.id === driver.id
        );
        if (driverOrders.length >= 1) {
          const driverSocket = this.socketUserMap.get(driver.id);
          driverSocket.emit("driverHistory", { driverOrders });
          // console.log("driverOrders", driverOrders);
        }

        return;
      } else {
        this.createUser({ name, socket, user_type });
      }
    } else if (user_type === "sender") {
      const sender = this.senders.find((sender) => sender.id === id);
      if (sender) {
        this.assignSocket({ socket, user: sender });
        const senderOrders = this.orders.filter(
          (order) => order.sender !== null && order.sender.id === sender.id
        );
        if (senderOrders.length >= 1) {
          const senderSocket = this.socketUserMap.get(sender.id);
          console.log("senderOrders", senderOrders);
          senderSocket.emit("senderHistory", { senderOrders });
          
        }
        return;
      } else {
        this.createUser({ name, socket, user_type });
      }
    }
  }

  assignSocket({ socket, user }) {
    // console.log("Assigning socket to user", user.name);
    this.socketUserMap.set(user.id, socket);
  }

  sendEvent({ socket, data, eventname }) {
    socket.emit(eventname, data);
  }

  createUser({ name, socket, user_type }) {
    switch (user_type) {
      case "driver":
        const driver = new Driver(name);
        this.drivers.push(driver);
        this.assignSocket({ socket, user: driver, user_type });
        this.sendEvent({
          socket,
          data: { driver },
          eventname: "driverCreated",
        });
        console.log("Driver created");
        return driver;
      case "sender":
        const sender = new Sender(name);
        this.senders.push(sender);
        this.assignSocket({ socket, user: sender, user_type });
        this.sendEvent({
          socket,
          data: { sender },
          eventname: "senderCreated",
        });
        // console.log("Sender created", this.senders);
        return sender;
      default:
        throw new Error("Invalid user type");
    }
  }

  requestOrder({ current_location, destination, price, id }) {
    // console.log("Requesting order");
    const sender = this.senders.find((sender) => sender.id === id);
    const order = new Order({ current_location, destination, price, sender });
    this.orders.push(order);

    // notify drivers
    for (const driver of this.drivers) {
      if (driver.in_ride) continue;
      this.sendEvent({
        socket: this.socketUserMap.get(driver.id),
        data: { order },
        eventname: "orderRequested",
      });
    }

    // console.log("Order requested", order);
    return order;
  }

  acceptOrder(order) {
    const { id, driver_id } = order;
    // get all info about order
    const driver = this.drivers.find((driver) => driver.id === driver_id);
    const _order = this.orders.find((order) => order.id === id);
    const sender = this.senders.find(
      (sender) => sender.id === _order.sender.id
    );

    // console.log("Accepting order", { _order, driver, sender });

    _order.assignDriver(driver);

    const userSocket = this.socketUserMap.get(sender.id);
    userSocket.emit("orderAccepted", { order: _order });

    const driverSocket = this.socketUserMap.get(driver.id);
    driverSocket.emit("orderAccepted", { order: _order });
    // setting in_ride to true and order status to accepted
    driver.in_ride = true;
    _order.in_ride = true;
    _order.status = "accepted";
    // console.log({ driver });

    // to display accepted order to other drivers
    for (const driver of this.drivers) {
      // console.log('for each driver', driver);
      if (driver.in_ride) continue;
      // console.log('after picking out the accepted driver', driver);
      const socket = this.socketUserMap.get(driver.id);
      // this.sendEvent({
      //   socket: this.socketUserMap.get(driver.id),
      //   data: { _order },
      //   eventname: "orderAccepted",
      // });
      socket.emit("orderAccepted", { order: _order });
    }
  }

  rejectOrder(order) {
    const { id, driver_id } = order;
    const driver = this.drivers.find((driver) => driver.id === driver_id);
    const _order = this.orders.find((order) => order.id === id);
    const sender = this.senders.find(
      (sender) => sender.id === _order.sender.id
    );
    _order.status = "rejected";

    // console.log("Rejecting order", { _order, driver, sender });

    const driverSocket = this.socketUserMap.get(driver.id);
    driverSocket.emit("orderRejected", { order: _order });
  }

  //   expireOrder(requestedOrder, io) {
  //     const { current_location, destination, price, id } = requestedOrder;
  //     // console.log({requestedOrder});
  //     const _order = this.orders.find(
  //       (requestedOrder) => requestedOrder.id === id
  //     );

  //     if (_order.status === "pending") {
  //     //   const driver = this.drivers.find(driver => driver.id === driver_id);
  //       io.emit("orderExpired", { _order });
  //     }
  //   }

  expireOrder(requestedOrder) {
    const { current_location, destination, price, id } = requestedOrder;
    // console.log({ requestedOrder });
    const _order = this.orders.find(
      (requestedOrder) => requestedOrder.id === id
    );
    // console.log({ _order });
    // console.log(_order.status);
    if (_order.status === "pending") {
      //   console.log("it got here");
      for (const driver of this.drivers) {
        if (driver.in_ride) continue;
        this.sendEvent({
          socket: this.socketUserMap.get(driver.id),
          data: { _order },
          eventname: "orderExpired",
        });
      }
      const senderId = _order.sender.id;
      // console.log(senderId)
      const sender = this.senders.find((sender) => sender.id === senderId);
      const senderSocket = this.socketUserMap.get(sender.id);
      senderSocket.emit("orderExpired", { _order });

      return;
    }
  }

  //   to finish the ride
  finishRide(finishedOrder) {
    // console.log({finishedOrder})
    const orderId = finishedOrder.order.id;
    // console.log({orderId})
    const _order = this.orders.find((order) => order.id === orderId);
    //   console.log({_order});
    //   console.log('the order found', finishedOrder, _order)
    const driver_id = _order.driver.id;
    const sender_id = _order.sender.id
    const driver = this.drivers.find((driver) => driver.id === driver_id);

    // console.log('finishRide', _order, orderId, driver_id, driver);
    // _order.status = "finished"
    driver.in_ride = false;
    _order.in_ride = false;
    // console.log({_order});
  }
}

module.exports = OrderingApp;
