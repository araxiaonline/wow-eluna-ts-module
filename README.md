# Eluna Typescript Module (ETS Modules) 

## Summary
This is a Typescript solution that enables developers to use TypeScript to build WoW modules for the [Eluna Engine](https://github.com/ElunaLuaEngine/Eluna/blob/master/README.md). The type defitions map to [Azeroth Core Eluna](https://www.azerothcore.org/pages/eluna/) API. 

The project itself is made possible by the great work by team that created [TypeScriptToLua](https://typescripttolua.github.io/). I recommend at least browsing through the docs on their site to understand how things work under the hood. 

This package is a heavily reworked version of the origina Eluna-TS package[ElunaTS](https://github.com/azerothcore/eluna-ts) by @Yehonal.  

## Updates
* New binary __ets__ simplifies how to setup new eluna-ts modules. 
* Reduces repo files and simplifies structure. 
* Focus on development of modules without need of container environment. 
* Fixes some of broken types I have encoutered and updates incorrect comments. 
* Added hot-reload option to eluna so locally running dev server will automatically reload Eluna on build changes.<br> --- __THIS FEATURE ONLY WORKS ON AZEROTH CORE DOCKER BUILDS__ (I am bias sincerely, the Mgt)

## Getting Started
---
Follow these instructions to create your first ets module. 

__Dependencies__
* NodeJS 18+
* MacOS and Ubuntu compatible  (Not tested for Windows builds, maybe WSL?)

### Creating a module
```
mkdir my-module
cd my-module
npm i wow-eluna-ts-module
```
### Initialize envionrment
You need some base environment variables to be able to transpile your first module. This command will create necessray files in your root directory to be able to build your first module.  I hate bloated boilerplates, so it gives you just the barebones to get something working. 
```
npx ets init
```
* Creates a ets.env - environment variables (you really shouldn't need to changes thse for small builds)
* Creates a tsconfig.json - Flavor how you like your environments to go, just make sure to leave references to types from the base project and TSTL parameters.  

There is also an additional option to create the ever so useful "Hello World!" template module. 
```
npx ets init -x
```

### Creating your module
Modules by default are loaded from modules directory, *./modules*.  
Best practices is to name a file with the item,event, action you are impacting, by hey you do you. If you have no imagination, a few examples are below: 
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
Building modules are easy and even have a help command! So do not worry cupcake I got ya covered. 
```bash
npx ets build 
```
This will transpile the modules you have in *modules* into the *dist* directory. (Unless you got funky with the ets.env, then you are on your own there sparky.)

Well that is great, but annoying when you are actually working something right? Who has time and energy to go find a terminal and run a build every time you change the code.  Which you better be doing ofter or you are not doing it right. 

Instead you can use the handy -- watch option to make it auto-build for you on change. 
```bash
npx ets build -w
``` 
There we go now, now you can see your builds magically giving you errors and new versions of the lua files everytime you save.  Course... now I still have to type .reload eluna in my pesky terminal. 

Well again who has time for 14 key strokes and changing screen context.. oh the agony. I am way too lazy to keep steam doing that so give me that __HOT live reload__ action.  
```bash 
npx ets build -w -l
```
This automatically communicates to your local world server and sends it the reload eluna command. 

** NOTE: 
Live reload option is environment setup specific with many assumptions and I use docker version. If you are a native compile hippie, not gonna work for you, sorry. You will have to continue to trudge the 14 key strokes and complain about how hard you have it compared to the youth today. (Or if you want you could submit a PR wink..wink..nudge..nudge) 

## Configuration 
---
After you run ets init it will create an *env.ets*  file the following options are set: 

| Configuration | Description |
| --- | --- |
| ETS_BUILD_ROOT | The root directory of where new modules and common functions will be saved |
| ETS_MODULE_DIR | Where individual modules will be transpiled to. |
| ETS_COMMON_DIR | Where common functions will be transpiled when npx ets libs is run


## ETS Client

Commands to use the ETS client 

---
| Command | Description |
| --- | --- |
| `npx ets init` | Initializes new a project as a ets module with. <br>___Options:___<br> -x, --example : Creates Hello World example if modules directory is not created.  |
| `npx ets libs` | Create shared functions that can be used with modules. Carry over from eluna-ts |
| `npx ets build` | Transpiles the typescript modules into the build dir.  <br>___Options:___<br> -d, --luadir : Override the default root build directory <br> -m, --module : Override the name of the directory where build will transpiled modules to. <br> -w, --watch : Enable watch process to automatically build when TypeScrip code changes. <br> -l, -live-reload : Enables automatic eluna reloading if running a local docker build of Azeroth Core. 
| `npx ets publish` | Submits module(s) to registry for download to other servers and for use in CI/CD (Not yet publicly implemented)




## Additional Notes 
I linked the most important resources above. As this is OSS not everything that has a type actually works due to either a bug in Eluna or in the core itself.  

To save you pain of finding the sharp edges yourself here are the ones I know about: 
* __Instance Events__... yeah they don't work at all, but, ServerEvents related to Maps do, so try to get by with those.  The issue is posted somewhere and I might go fix the C++ one of these days if I really need it. 
* __Auction House Events__ not really useful as you lack the ability to capture AuctionHouseMgr updates so you can not manipulate anything at least not through a clean API.
* __Unique Creature Events__ - I really wanted this one to work as you could do some interesting things with it, but instead you need to do everything through creature events. 
* __Time translations__ - no Date Object, it doesnt work.  I have a lib of a few TS translations that will polyfill some of the common needs so you can do things with Game/Server time.  Will move into common libs once I have vetted them out more. 


## Thanks
Thanks to @AzerothCore Community and @Yehonal for the first pass on this one. 

I love that I can use TypeScript to do things it was never meant to do. The amount of transpiling and compiling that goes into getting this stuff to work on the server just feels right to me. 

## Unit tests
Yeah someday I might write some of these, or ask GPT-4 to write some for me, since I hate writing them myself. 
