
cloud-dLeyna
============

cloud-dLeyna - dLeyna for the Cloud - is a Web Application that implements
the DMP (Player) and the DMC (Controller) DLNA roles, on top of the dLeyna
media-service-upnp and renderer-service-upnp DBus APIs.


Requirements
------------

  * [dLeyna media-service-upnp](https://github.com/01org/media-service-upnp)
  * [dLeyna renderer-service-upnp](https://github.com/01org/renderer-service-upnp)
  * [Cloudeebus](https://github.com/01org/cloudeebus)


Running the server
------------------

The dLeyna components media-service-upnp and renderer-service-upnp, and the
Cloudeebus python server must be already installed. The dLeyna dbus services
will be launched when called from the Cloudeebus python server.

	cd js/lib/config
	./cloudeebus.sh


Acknowledgements
----------------

cloud-dLeyna includes libraries from the following open-source projects:

  * [Cloudeebus](https://github.com/01org/cloudeebus) ([Apache 2.0](http://opensource.org/licenses/Apache-2.0) License)
  * [AutobahnJS](http://autobahn.ws/js) ([MIT](http://opensource.org/licenses/MIT) License)
