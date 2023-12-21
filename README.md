[![npm version](https://badge.fury.io/js/wow-eluna-ts-module.svg)](https://badge.fury.io/js/wow-eluna-ts-module)
# Eluna Typescript Module (ETS-Cli) 

## Summary
This is a cli tool that uses TypeScript definitions in combination with TypeScriptToLua scripts for use with a WoW Azerothcore server running [Eluna](https://www.azerothcore.org/pages/eluna/) Mod. This enables developer that are familiar with TypeScript to develop
custom scripts that are then converted into lua scripts by [TypeScriptToLua](https://typescripttolua.github.io/) package.  The goal is to make it easy to create custom content or augment existing content to fit the needs of your server and players without the requirement of
learning Lua. 

I have ported multiple declartions files into one defintion this repo relies on and updated declarations to incorporate new Eluna releases and fixes for broken declarations. If you encounter a bug or an issue, use the GitHub issues or ping
me in the azerothdiscord channel. @volek.

The following declarations are included: 
- Eluna Azerothcore
- WoW API
- AIO (Rochet2)

## Creating a new module
---
Follow these instructions to create your first ets module. 

__Dependencies__
* NodeJS 18+
* MacOS and Ubuntu compatible  (Not tested for Windows builds, maybe WSL?)

### Creating your first ets module
Initialize a typical node typescript project as you normally would
```
mkdir my-module
cd my-module
npm init
```

Install the ets package and use the cli to initialize your module. 
```
npm i wow-eluna-ts-module
npx ets init -x
```
This does the following: 
- Creates a ets.env - environment variables (you really shouldn't need to changes thse for small builds)
- Creates a tsconfig.json - Flavor how you like your environments to go, just make sure to leave references to types from the base project and TSTL parameters.
- Creates a sample "Hello World!" module, which is amazingly useful. I know. 

> [!NOTE]
> IF you do not want the example module just exclude the _-x_ argument. 

Modules by default are loaded from modules directory, *./modules*. Any directory structure under the *modules* directory will be maintained in the converted lua output. So you can structure
them however makes sense for your code maintance. 

I personall like the practice of using item/event, action you are impacting, by hey you do you. If you have no imagination, a few examples are below: 
```file
-modules
--| onstart-death-wind.ts    // Global Events at top level, ie Server Start kill all vendors in Stormwind. 
--| game-events
----| looty-tuesday.ts       // Events you may target as an in game event
--| items
----| the-ass-sassinator.ts  // The axe to kill your friends and steal their stuff. 
--| player
----| screw-bob.ts           // Fun player event that resets money on level if your name happens to be bob. 
```

### Build your module 
When have completed building your first original module, you will need to run a build to convert the TypeScript code into lua the Eluna Module system will read. However, building modules are easy and even have a help command! So do not worry cupcake I got ya covered. 

```bash
npx ets build 
```

This will transpile the modules you have in *modules* into the *dist* directory, by default. Well that is great, but annoying when you are actually working something right? 
Who has time and energy to go find a terminal and run a build every time you change the code.  Which you better be doing ofter or you are not doing it right. 

Instead you can use the handy -- watch option to make it auto-build for you on change. 
```bash
npx ets build -w
``` 
There we go now, now you can see your builds magically giving you errors and new versions of the lua files everytime you save.  Course... now I still have to type .reload eluna in my pesky terminal. 

### Deploying your Module
I recently added the ability to make it easier to deploy modules to servers via SSH. This does require you have some knowledge on SSH works and making sure
your server accepts SSH connections.  The cli supports two environments a dev and prod environment.  This is typical of most development to have a place to test if you are running
remote dev and production servers.  If you are running locally, I would recommend just adding a ```bash cp -r  dist.* azerothcore/scipts/``` to an alias or something to make it easier to test.  

The environment variables are found in *ets.env* for each environment.  After setting these up you can use the deploy command to deploy changes as needed. 

Production Deployment
```bash
npx ets deploy -e prod
```

Development Deployment
```bash
npx ets deploy -e dev
```

The details of the cli options and settings cabn be found below. 

### Anatomy of a module
The individual scripts themselves breakdown into a few key components: 

- Event Handlers
- Event Registers
- Objects that contain game information

A typical module structure should look like this: 
```javascript
/**
* Module Purpose
* @author
* @date
*/ 

/**
* Configuration
*/
const CONFIG_OPTION: string = "DefaultConfig"
 
/**
* Event Handlers
*/
const OnCommand: player_event_on_command = ( event: number, player: Player, command: string ) {
  // your code on that action
}

/**
* Event Registers
* EventHooks: https://www.azerothcore.org/pages/eluna/?search=Register
*/ 
RegisterPlayerEvent(PlayerEvents.PLAYER_EVENT_ON_COMMAND, (...args) => onCommand(...args)); 
```

Any modules you create should be added to the index.ts without the extenstion. It is also possible to create shared classes
that can be used in many modules.  You should create these as classes and import as you normally would. There are some
caveats to TypescriptToLua that can be hang-ups in the lua conversion process, so I recommend you keep the complexity
of imports and classes simple functions and types. 

## Environment Settings Configuration 
---
After you run ets init it will create an *env.ets*  file the following options are set: 

| Build Configuration | Description |
| --- | --- |
| ETS_BUILD_ROOT | The root directory of where new modules and common functions will be saved. Defaults to './dist' |
| ETS_MODULE_DIR | Where individual modules will be transpiled to. Defaults to 'module' |
| ETS_COMMON_DIR | Where common functions will be transpiled when npx ets libs is run. Defaults to 'common' |
| ETS_MODULES_TS_DIR | The root directory of where TypeScript modules are created. Defaults to 'modules' |

**Deployment Configuration**
You can now use ETS command line to deploy the built modules. The following configurations options are needed to send SCP commands to the server running your server. 
| Deploy Configuration | Description |
| --- | --- |
| DEV_HOST | Host address where to connecto scp files.  IF localhost or 127.0.0.1 is set, then it will instead perform a normal cp to the local filesystem |
| DEV_PATH | Where on the server the files will be copied to. |
| DEV_USER | SCP user to login to the server with |
| DEV_PASS | SCP user password to login to the server with |
| DEV_PORT | Port to use when authenticating with the server, if not set defaults to 22 |
| DEV_PRIVATE_KEY | Path to a private key that is used to connect to the remote host. |
| DEV_PRIVATE_KEY_PASS | PAssphrase used with the private key to connect to the remote host |

> All the settings above are duplicated for a production environment by substituting PROD_ instead of DEV_.  These are already defined in your default ets.env

## ETS Client

Commands to use the ETS client 

---
| Command | Description |
| --- | --- |
| `npx ets init` | Initializes new a project as a ets module with. <br>___Options:___<br> -x, --example : Creates Hello World example if modules directory is not created.  |
| `npx ets libs` | Create shared functions that can be used with modules. Carry over from eluna-ts |
| `npx ets build` | Transpiles the typescript modules into the build dir.  <br>___Options:___<br> -d, --luadir : Override the default root build directory <br> -m, --module : Override the name of the directory where build will transpiled modules to. <br> -w, --watch : Enable watch process to automatically build when TypeScrip code changes. <br> -l, -live-reload : Enables automatic eluna reloading if running a local docker build of Azeroth Core. 
| `npx ets deploy` | Deploys your modules to a remote host or local host dependingon the configurations set. Can target a deployment environment by using -e.  <br>__Options:__<br> -e, --env : Set the target environment to deploy the files to, (default: dev)
| `npx ets publish` | Submits module(s) to registry for download to other servers and for use in CI/CD (Not yet publicly implemented)


## Additional Notes 
I linked the most important resources above. As this is OSS not everything that has a type actually works due to either a bug in Eluna or in the core itself.  

To save you pain of finding the sharp edges yourself here are the ones I know about: 
* __Instance Events__... yeah they don't work at all, but, ServerEvents related to Maps do, so try to get by with those.  The issue is posted somewhere and I might go fix the C++ one of these days if I really need it. 
* __Auction House Events__ not really useful as you lack the ability to capture AuctionHouseMgr updates so you can not manipulate anything at least not through a clean API.
* __Unique Creature Events__ - I really wanted this one to work as you could do some interesting things with it, but instead you need to do everything through creature events. 
* __Time translations__ - no Date Object, it doesnt work.  I have a lib of a few TS translations that will polyfill some of the common needs so you can do things with Game/Server time.  Will move into common libs once I have vetted them out more. 

## Updates
**Dec 21, 2023 v1.6.7**
* CHORE: Removed typeroots not needed in tsconfig.module.json anymore 

**Dec 21, 2023 v1.6.6**
* CHORE: Updated prod/dev dependencies

**Dec 21, 2023 v1.6.5**
* FEATURE: Updated wow-wothlk-declarations to latest version
* BUG: Fixed Gameobject hooks for on use
* BUG: Updated tsconfig strict to false from true was creating problems with CreateFrame and UI Parent for WOWAPI 

**Nov 30, 2023 v1.6.4**
* Added some readme improvements
* Fixed major breaking bug with ets init -x
  
**Oct 16, 2023 v1.5.0**
* Feature: Adds deploy command to enable module deployment from same command. See configuration and command details below. 
* Feature: Added support for AIO definitions for modules built for Rochet2 AIO 
* Feature: Added wow-wotlk-declarations for references to AddOn WoWAPI commands when building AIO client side UI's

**Oct 10, 2023 v1.4.0**
* Bug: Fixed bug with ets build when there is not a common directory build in tstl process
* Bug: Watch is not correctly building tstl marking as not usable at the moment, will fix later. 

**Oct 3, 2023 v1.3.0**
* New binary __ets__ simplifies how to setup new eluna-ts modules. 
* Reduces repo files and simplifies structure. 
* Focus on development of modules without need of container environment. 
* Fixes some of broken types I have encoutered and updates incorrect comments. 
* Added hot-reload option to eluna so locally running dev server will automatically reload Eluna on build changes.<br> --- __THIS FEATURE ONLY WORKS ON AZEROTH CORE DOCKER BUILDS__ (I am bias sincerely, the Mgt)


