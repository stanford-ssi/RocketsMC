----------


Rockets MC User Guide
-------------

Let's jump right in. If you followed the README you should have the app up and running. Let's cover the basics:

- How to register a new flight (with or without downlink)
- How to view all registered flights
- How to launch live view (as an observer or controller)
- How to manage registered flights

####Registering a new flight

From the landing page click on "Register a new flight"

![enter image description here](https://lh3.googleusercontent.com/-MnTcL_ByB-s/WIOUsCnNR4I/AAAAAAAAAeI/2KKc54caODE4OrcDOl7Y9cGEwuCw07KnACLcB/s0/landingpage.png "landingpage.png")

You'll now see all the required info for registering a flight in the RocketsMC database. 

![enter image description here](https://lh3.googleusercontent.com/-R9mSeKT4NRE/WIOU9P9t-QI/AAAAAAAAAeQ/CNQ98o34FaQv5FGZef0NuCRdjWS9KeN-QCLcB/s0/Screen+Shot+2017-01-21+at+6.03.24+PM.png "registration")

All this stuff is fairly self explanatory and should be found on your PFA. The interesting stuff is at the bottom of the registration page ... well only interesting if your rocket is has a downlink radio onboard! 

![enter image description here](https://lh3.googleusercontent.com/-xk9lgadqVd4/WIOVgDsQTMI/AAAAAAAAAeg/7aslbgP3sfoUc6tYL4Y2S-OohE8T7dk4ACLcB/s0/Screen+Shot+2017-01-21+at+6.07.24+PM.png "Kytheraconfig.png")

This is where you can configure the downlink encoding scheme so that rocketsMC knows how to decode all the channels you're sending down. Your downlink radio should be configured to send down a message formatted as follows:

 - Index 0->1: Vehicle state (pre-defined integer between 0 -> 99)
 - Index 2: Message type (either "D" for a "directive" sent to chat window or "K" for a data message to be parsed)
	 - if Directive: index 3 -> EOM is the message string to be displayed
	 - if Data message: index 3 -> EOM is the data downlink parsed by the flight parse character
 
If that's all set you should select "This flight uses Kythera" which will enable you to input the RX config info. Make sure you have the RX radio handy and plugged into the computer where the RocketsMC server is running (ie. do not plug the radio into a client computer where you are just accessing RocketsMC over the local network). Then, get the port name path from root so the server can connect to RocketsMC and type it into the first field "TTY port name". The example port name is one that I got from opening XCTU and looking for device name on the XBEE I had plugged in.

Next, you'll need to specify the baud rate that the rocket is transmitting at. Pretty chill. Up next is the message parse character (ie. the character you put at the end of each message you transmit. This is usually the newline character but change as necessary.

Now the fun part. It is super important that you do this correctly!! For every data field you want to downlink, you should have each value separated by some delimiting character. I'd say stick with a comma. It makes everything easier. But if you do change it, go ahead and reflect that in the next field. 

Then, add each data channel, **IN ORDER** by selecting "Add Channel". You'll be asked for the channel name (ie. Altitude or Temp) and the name of the units. This needs to be in the order included in your downlink messages. Make sure the transmitting node on the rocket always includes some data for each field (even if you haven't made a new measurement). Rule of thumb is to stick to the scheme you define here. 

Finally, define the flight states! Flight states are an easy way to quickly ascertain what point of flight the rocket is in (pre-flight, ignition, motor burnout, coast, apogee, recovery deployed, etc.). The states are defined as integers from 00 to 99. You should make sure the transmitting node always sends two characters to represent the state (ie. 00,01,02,03,04,05,06,07,08,09,10,11...99). You likely won't need all 99 states. If you send down a 06, RocketsMC will display the 7th state name you entered on the flight config page. So again, make sure the states are **IN ORDER**. 

Alright, now that you're all done, click register and you'll be directed back to the login page. 


####How to view all registered flights

![enter image description here](https://lh3.googleusercontent.com/-xW7RaHzZwyU/WIOcBHlsUMI/AAAAAAAAAfY/nejIF7t5Lw8GdWn7v5xSU9BMA8Om4CbEQCLcB/s0/Screen+Shot+2017-01-21+at+6.35.45+PM.png "flightsView.png")

If you just want to hop on as an observer of all active flights (ie. you're not a flight controller and you don't want to delete any flights, select "View only session" from the login page. 

You'll see the flights-list page with all registered flights. You can download the flight report for all flights. This will prepare a .txt file of the PFA info and, for completed Kythera flights with saved data, you'll get a .csv of all saved data. You can also open your mail client to send the files to yourself once the RocketsMC computer has internet access again. 

Click on the flight name (red bar) for a quick dropdown view of the flight info. 

For Active Kythera flights that don't have a flight controller present, you'll see a red box that says "This flight is currently idle..." under the flight name. This means that the server has not yet started logging any data from the RX module. We'll cover flight activation and control in the next section. 

####How to launch live view (as an observer or controller)

If there's a rocket flying a downlink module and it's registered in rocketMC, someone will need to login as the flight controller before the flight downlink can be parsed. Login as a flight controller, select "Assume control", and accept the flight login terms by pressing "Give me the controls" on the modal. 

![enter image description here](https://lh3.googleusercontent.com/-9pTR_AjLKYM/WIOeQcXjuCI/AAAAAAAAAfw/5RoxqMvTwCAuC6rW1yRvPCkOAifyPSuTQCLcB/s0/Screen+Shot+2017-01-21+at+6.42.33+PM.png "Screen Shot 2017-01-21 at 6.42.33 PM.png")

You'll then be redirected to the "Live view" page if a connection was successfully made to the RX module. If the rocket is transmitting, the graphe 
 

