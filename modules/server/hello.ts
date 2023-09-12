/**
 * Will say hello to the world when the command .hello is entered.
 * @event PLAYER_EVENT_ON_COMMAND 
 */
 class Hello {
    onCommand: player_event_on_command = (
      event: number,
      player: Player,
      command: string
    ) => {
      if (command == "hello") {
        const message = "Hello World command was entered!";
        
        SendWorldMessage(message);
      }    
      return true;
    };
  }
  
  // Just say Hello to the world.
  const hello = new Hello();
  RegisterPlayerEvent(PlayerEvents.PLAYER_EVENT_ON_COMMAND, (...args) =>
    hello.onCommand(...args)
  );
  