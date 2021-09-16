DISCONTINUATION OF PROJECT.

This project will no longer be maintained by Intel.

Intel will not provide or guarantee development of or support for this project, including but not limited to, maintenance, bug fixes, new releases or updates.

Patches to this project are no longer accepted by Intel.

If you have an ongoing need to use this project, are interested in independently developing it,
or would like to maintain patches for the community, please create your own fork of the project.


cloud-dLeyna
============

cloud-dLeyna - dLeyna for the Cloud - is a Web Application that implements
the DMP (Player) and the DMC (Controller) DLNA roles, on top of the 
dleyna-server and dleyna-renderer DBus APIs.


Requirements
------------

  * [dleyna-server](https://github.com/01org/dleyna-server)
  * [dleyna-renderer](https://github.com/01org/dleyna-renderer)
  * [Cloudeebus](https://github.com/01org/cloudeebus)


Running the server
------------------

The dLeyna server and renderer components, as well as the
Cloudeebus python server must be already installed. The dLeyna dbus services
will be launched when called from the Cloudeebus python server.

	cd js/lib/config
	./cloudeebus.sh


Acknowledgements
----------------

cloud-dLeyna includes libraries from the following open-source projects:

  * [Cloudeebus](https://github.com/01org/cloudeebus) ([Apache 2.0](http://opensource.org/licenses/Apache-2.0) License)
  * [AutobahnJS](http://autobahn.ws/js) ([MIT](http://opensource.org/licenses/MIT) License)
