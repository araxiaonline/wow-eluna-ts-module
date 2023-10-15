/**
 * AIO (Addon-IO) is a framework for managing and enhancing World of Warcraft addons.
 * It provides a seamless way to handle communication between server and client-side code,
 * making it easier to develop cross-platform WoW addons with shared functionality.
 *
 * To use AIO in your addon:
 * 1. Include AIO in your Lua script: 'local AIO = AIO or require("AIO")'.
 * 2. Determine if the code is running on the server or client: 'isServer = AIO.IsServer()'.
 * 3. Add your Lua code for server or client using 'AIO.AddAddon()' to ensure synchronized execution.
 * 4. Use AIO's messaging system to communicate and synchronize data between server and client.
 *
 * AIO simplifies the development of powerful and flexible World of Warcraft addons,
 * allowing you to create addons that seamlessly run on both server and client sides
 * while maintaining shared data and functionality.
 */
/** @noSelf **/
declare interface AIO {
    
    /**
     * Returns true if we are on server side, false if we are on client side
     */
    isServer(): boolean;

    /**
     * Returns AIO version - note the type is not guaranteed to be a number
     */
    GetVersion(): string; 

    /**
     * Adds the file at the given path to files to send to players if called on the server side.
     * @param path - The path to the file.
     * @param name - An optional name for the addon.
     * @returns Returns true on the server side and false on the client side.
     */
    AddAddon(path: string, name?: string): boolean;

    /**
     * Adds 'code' to the addons sent to players. The function only exists on the server side.
     * @param name - An unique name for the addon.
     * @param code - The code to be added to the addons.
     */
    AddAddonCode(name: string, code: string): void;

    /**
     * Triggers the handler function that has the name 'handlername' from the handlertable added with AddHandlers for the 'name'.
     * Can also trigger a function registered with RegisterEvent.
     * @param player - The player for whom the handler should be triggered (server-side only).
     * @param name - The name of the handler.
     * @param handlername - The name of the handler function.
     * @param args - Additional arguments to pass to the handler.
     */
    Handle(player: Player, name: string, handlername: string, ...args: any): void;

    /**
     * Adds a table of handler functions for the specified 'name'.
     * @param name - The name of the handlers.
     * @param handlertable - An object containing handler functions.
     * @returns Returns the passed 'handlertable'.
     */
    AddHandlers(name: string, handlertable: Record<string, (...args: any) => void>): Record<string, (...args: any) => void>;

    /**
     * Adds a new callback function that is called if a message with the given name is received. All parameters the sender sends in the message will be passed to func when called.
     * @param name - The name of the callback.
     * @param func - The callback function.
     */
    RegisterEvent(name: string, func: (...args: any) => void): void;

    /**
     * Adds a new function that is called when the initial message is sent to the player. The function is called before sending, and the initial message is passed to it along with the player if available (server-side only).
     * @param func - The function to be called when the initial message is sent.
     */
    AddOnInit(func: (msg:Msg, player?: Player) =>Msg): void;

    /**
     * Key is a key for a variable in the global table _G. The variable is stored when the player logs out and will be restored when they log back in before the addon codes are run. These variables are account-bound. This function only exists on the client side, and you should call it only once per key.
     * @param key - The key for the variable in the global table _G.
     */
    AddSavedVar(key: string): void;

    /**
     * Key is a key for a variable in the global table _G. The variable is stored when the player logs out and will be restored when they log back in before the addon codes are run. These variables are character-bound. This function only exists on the client side, and you should call it only once per key.
     * @param key - The key for the variable in the global table _G.
     */
    AddSavedVarChar(key: string): void;

    /**
     * Makes the addon frame save its position and restore it on login. If char is true, the position saving is character-bound; otherwise, it's account-bound. This function only exists on the client side, and you should call it only once per frame.
     * @param frame - The addon frame to save its position.
     * @param char - Whether the position saving is character-bound (true) or account-bound (false).
     */
    SavePosition(frame: any, char?: boolean): void;

    /**
     * Creates and returns a new AIO message that you can append data to and send to a client or the server.
     * @returns A new AIO message.
     */
    Msg(): Msg;
}

/**
 * Represents an AIO message, an essential component for communication and data synchronization within the AIO framework.
 * 
 * AIO messages facilitate seamless communication between server and client components of your addon. They allow you to package and send data, commands, and information, enabling real-time interaction and data sharing.
 * 
 * Usage:
 * 1. Use the `Add` method to define the purpose of the message and include any additional data.
 * 2. Append multiple messages using the `Append` method for more complex interactions.
 * 3. Use the `Send` method to transmit the message to the designated recipients (players or the server).
 * 4. You can check if a message contains data using the `HasMsg` method.
 * 5. Convert the message to a string with the `ToString` method, if needed.
 * 6. To clear the message and start fresh, use the `Clear` method.
 * 7. The `Assemble` method is mainly for internal use.
 * 
 * With AIO messages, you can seamlessly exchange information and instructions between different parts of your addon, enhancing its functionality and interactivity.
 */
/** @noSelf **/
declare interface Msg {
    /**
     * The name is used to identify the handler function on the receiving end. A handler function registered with RegisterEvent will be called on the receiving end with the varargs.
     * @param name - The name used to identify the handler function.
     * @param args - Additional arguments to include in the message.
     * @returns The AIO message.
     */
    Add(name: string, ...args: any): Msg;
  
    /**
     * Appends messages to each other and returns self.
     * @param msg - The message to append.
     * @returns The AIO message.
     */
    Append(msg: Msg): Msg;
  
    /**
     * Sends the message. Server-side version sends to all players passed, and client-side version sends to the server.
     * @param player - The player to send the message to (server-side only).
     * @param args - Additional arguments to include in the message.
     * @returns The AIO message.
     */
    Send(player?: Player, ...args: any):Msg;
  
    /**
     * Returns true if the message has something in it.
     * @returns True if the message has data; otherwise, false.
     */
    HasMsg(): boolean;
  
    /**
     * Returns the message as a string.
     * @returns The message as a string.
     */
    ToString(): string;
  
    /**
     * Erases the so far built message and returns self.
     * @returns The cleared AIO message.
     */
    Clear():Msg;
  
    /**
     * Assembles the message string from added and appended data. Mainly for internal use.
     * @returns The AIO message.
     */
    Assemble():Msg;
  }

  /**
   * Prints debug information 
   * @param args 
   */
  declare function AIO_debug(...args: any): void;

  declare class msgmt {
    Add(name: string, ...args: any): void;  
  }