# ordering_service

added in_ride property to the order object
Context
We want to build the functionality to request a driver. When a driver is online, they should be able to see and accept/reject order requests from senders. The sender would also be able to see who has accepted their ride. We don’t need to worry about the mapping serving or what happens after.

Requirements
Sender should be able to make an order request
Driver should be able to see the order request
The order request should have current location, destination, price, and sender information
Driver should be able to accept or reject the order
The sender should be able to see acceptance of the order

OOA

Driver
id
acceptOrder(order)
rejectOrder(order)
Sender
id
RequestOrder(order)


Order
id
Status: [accepted, rejected, pending]
assignDriver(driver)



Events
orderRequested
orderAccepted
orderRejected
userCreated
driverNotFound




Assignment:
When a sender makes a request, it should expire after 1 minute if no driver has accepted or rejected the request, notify the user that no driver was found and remove the notification from the driver
When a driver has already accepted a request, they should not be able to get notifications because they are already in a ride(you can optionally add a finish ride functionality to stop the ride)
Currently, when multiple drivers are connected and one of the driver has accepted a request, the other drivers should see accepted on their screens
As a driver or sender, when I reload the page, I should see order/event history
