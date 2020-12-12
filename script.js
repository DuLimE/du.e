/*
Todo:
- Add meatballs to code in order to create a delicious meal.
- Add traces to networks when hacking. These are events which after a time finish and end the game for the player. (MRQ)
- Add a 'stoptrace' command which stops a trace (and any subsequent ones) from a network. This will require the network to allready have been hacked. (MRQ)
- Finish all basic help data. (NR)
*/

// Initialising HTML elements.
var logs = document.getElementById("logContainer").children
var input = document.getElementById("input")
var displays = document.getElementById("posBox").children
var ipDisplay = displays[0]
var macDisplay = displays[1]
var fileDisplay = displays[2]
var loadInput = document.getElementById('loadInput')
loadInput.addEventListener('change', mount, false)

// Initialising command memory variables.
var maxPrevCommands = 64
var prevCommands = []
var currentPos = -1
var pauseReason = null
var inParse = false
var commandQueue = []

// Bool for not entering command.
var noCommand = false

// Loading bar variables.
var loadMax = 0
var loadTime = 0
var loadTitle = ""
var loadEndMsg = ""
var loadFunction = ""
var loadData = []

// Handles keyboard input.
input.addEventListener("keydown", function(event) {
  switch (event.keyCode) {
    case 13: // Enter
      event.preventDefault()
      if (pauseReason === null && !inParse && commandQueue.length <= 0) {
        parseInput(input.value)
        if (!noCommand) {
          if (prevCommands[0] !== input.value) {
            prevCommands.unshift(input.value)
            if (prevCommands.length > maxPrevCommands) {
              prevCommands = prevCommands.slice(0, maxPrevCommands)
            }
          }
          input.value = ""
          currentPos = -1
        } else {
          noCommand = false
        }
      }
      break
    case 27: // Escape
      event.preventDefault()
      input.value = ""
      break
    case 38: // Up Arrow
      event.preventDefault()
      if (prevCommands.length > 0) {
        if (currentPos < prevCommands.length - 1) {
          currentPos += 1
        }
        input.value = prevCommands[currentPos]
      }
      break
    case 40: // Down Arrow
      event.preventDefault()
      if (currentPos > -1) {
        currentPos -= 1
        if (currentPos === -1) {
          input.value = ""
        } else {
          input.value = prevCommands[currentPos]
        }
      }
      break
    case 76: // Control + L
      if (event.ctrlKey) {
        event.preventDefault()
        clearLogs()
      }
      break
    case 82: // Control + R
      if (event.ctrlKey) {
        event.preventDefault()
        reset()
      }
      break
  }
})

// Disconnect from the current instance.
function disconnect() {
  instance = null
  addLoadingBar("Culling", 500, "Disconnected from remote server.", "connect", [playerNetwork, playerHost])
}

// Parse user input.
function parseInput(input) {
  inParse = true
  if (instance !== null && input === "disconnect") {
    clearLogs()
    disconnect()
  } else {
    switch (instance) {
      case "bank":
        doBank(input)
        break
      case "shop":
        doShop(input)
        break
      case "fence":
        doFence(input)
        break
      case null:
        addLog("> " + input)
        parseCommand(quoteSplit(input," "))
        break
    }
  }
  inParse = false
}

// Defines actions to be run when entering an instance.
function startInstance() {
  switch (instance) {
    case "bank":
      networks[bankIP].data.pos = 0
      networks[bankIP].data.tempUser = ""
      clearLogs()
      addLog("Welcome to the Aurora Inc. Online Banking Server!")
      addLog(["Type '1' to create an account.", "Type '2' to download the Aurora Banking Application."])
      break
    case "shop":
      clearLogs()
      if (!findFile(devices[playerHost].files, ["Users","admin","Applications","Bank.exe"], "bank") || currentBank === "") {
        addLog("ERROR - Bank account not found.")
        networks[shopIP].data.pos = -1
        break
      } else {
        networks[shopIP].data.pos = 0
        addLog("Welcome to the Aurora Inc. Online Shop!")
        addLog(["Type '1' to purchase items.", "Type '2' to download a network bookmark for the shop."])
      }
      break
    case "fence":
      clearLogs()
      addLog("Welcome to The Fence.")
      addLog(["Type '1' to download the file trading application."])
      break
  }
}

// Enters an instance.
function enterInstance(inst) {
  instance = inst
}

// Prints a network menu.
function printMenu(items, page, title, logs) {
  clearLogs()
  var list = []
  for (var i = 0; i < items.length; i++) {
    var line = "[" + i + "] " + items[i][0] + " - "
    line += items[i][1] + "¤"
    list.push(line)
  }
  var menu = printHelp(title, list, page, 10)
  addLog(menu)
  addLog(logs)
}

// Runs the fence website instance.
function doFence(command) {
  var back = false
  var line = ["Type '1' to download the file trading application."]
  switch (command) {
    case "1":
      clearLogs()
      var downloads = navigateObject(devices[playerHost].files, ["Users","admin","Downloads"])
      if (downloads === undefined || downloads.type !== undefined) {
        addLog("ERROR - Folder 'Downloads' nonexistant.")
        addLog(line)
        break
      }
      copyFile(networks[fenceIP].data.files["Sell.exe"], downloads, "Sell.exe")
      addLoadingBar("Grabbing", 3000, [["Copied 1 item to downloads."], line], "clearLogs")
      break
    default:
      noCommand = true
      break
  }
}

// Prints the shop menu.
function printShop() {
  printMenu(networks[shopIP].data.items, networks[shopIP].data.page, "Aurora Shop:", ["Type 'back' to exit.", "Type 'buy' <INT> to buy an item.", "Type 'page <INT>' to switch shop page."])
}

// Runs the shop website instance.
function doShop(command) {
  var back = false
  var line = ["Type '1' to purchase items.", "Type '2' to download a network bookmark for the shop."]
  switch (networks[shopIP].data.pos) {
    default:
      noCommand = true
      break
    case 0:
      switch (command) {
        case "1":
          networks[shopIP].data.page = 1
          networks[shopIP].data.pos = 1
          printShop()
          break
        case "2":
          clearLogs()
          var downloads = navigateObject(devices[playerHost].files, ["Users","admin","Downloads"])
          if (downloads === undefined || downloads.type !== undefined) {
            addLog("ERROR - Folder 'Downloads' nonexistant.")
            addLog(line)
            break
          }
          copyFile(networks[shopIP].data.files["shop.cmd"], downloads, "shop.cmd")
          addLoadingBar("Grabbing", 3000, [["Copied 1 item to downloads."], line], "clearLogs")
          break
        default:
          noCommand = true
          break
      }
      break
    case 1:
      printShop()
      if (command === "back") {
        back = true
        break
      }
      if (command.slice(0, 5) === "page ") {
        var part = command.slice(5, command.length)
        if (!isNumber(part, -1) || Number(part) > (networks[shopIP].data.items.length / 10) + 1) {
          addLog("ERROR - Index nonexistant.")
          break
        }
        if (Number(part) === (networks[shopIP].data.items.length / 10) + 1) {
          addLog("ERROR - Cannot change pages to current page.")
          break
        }
        networks[shopIP].data.page = Number(part)
      }
      if (command.slice(0, 4) === "buy ") {
        var part = command.slice(4, command.length)
        if (!isNumber(part) || Number(part) >= networks[shopIP].data.items.length) {
          addLog("ERROR - Index nonexistant.")
          break
        }
        if (networks[bankIP].data.accounts[currentBank][1] < networks[shopIP].data.items[Number(part)][1]) {
          addLog("ERROR - Insufficiant money for purchase.")
          break
        }
        var downloads = navigateObject(devices[playerHost].files, ["Users","admin","Downloads"])
        if (downloads === undefined || downloads.type !== undefined) {
          addLog("ERROR - Folder 'Downloads' nonexistant.")
          break
        }
        networks[bankIP].data.accounts[currentBank][1] -= networks[shopIP].data.items[Number(part)][1]
        clearLogs()
        copyFile(networks[shopIP].data.items[Number(part)][2], downloads, networks[shopIP].data.items[Number(part)][0] + ".exe")
        addLoadingBar("Grabbing", 3000, ["Copied 1 item to downloads."], "printShop")
      }
      break
  }
  if (back) {
    networks[shopIP].data.pos = 0
    clearLogs()
    addLog(line)
  }
}

// Runs the banking website instance.
function doBank(command) {
  var back = false
  var line = ["Type '1' to create an account.", "Type '2' to download the Aurora Banking Application."]
  var unametext = ["Enter a Username: (type 'back' to exit)"]
  var pwordtext = ["Enter a Password: (type 'back' to exit)"]
  var parsed = command.replace(/["]/g,"")
  switch (networks[bankIP].data.pos) {
    case 0:
      switch (command) {
        case "1":
          networks[bankIP].data.pos = 1
          clearLogs()
          addLog(unametext)
          break
        case "2":
          clearLogs()
          var downloads = navigateObject(devices[playerHost].files, ["Users","admin","Downloads"])
          if (downloads === undefined || downloads.type !== undefined) {
            addLog("ERROR - Folder 'Downloads' nonexistant.")
            addLog(line)
            fail = -1
            break
          }
          copyFile(networks[bankIP].data.files["Bank.exe"], downloads, "Bank.exe")
          addLoadingBar("Grabbing", 3000, [["Copied 1 item to downloads."], line], "clearLogs")
          break
        default:
          noCommand = true
          break
      }
      break
    case 1:
      if (command === "back") {
        back = true
        break
      }
      clearLogs()
      addLog(unametext)
      if (networks[bankIP].data.accounts[parsed] !== undefined) {
        addLog("Username already taken.")
        break
      }
      if (parsed.length < 1) {
        noCommand = true
        break
      }
      networks[bankIP].data.tempUser = parsed
      networks[bankIP].data.pos = 2
      clearLogs()
      addLog(pwordtext)
      break
    case 2:
      if (command === "back") {
        back = true
        break
      }
      clearLogs()
      addLog(pwordtext)
      if (parsed.length < 1) {
        noCommand = true
        break
      }
      clearLogs()
      networks[bankIP].data.accounts[networks[bankIP].data.tempUser] = [parsed, 10]
      addLog(["Created user '" + networks[bankIP].data.tempUser + "'."])
      addLog(line)
      networks[bankIP].data.pos = 0
      break
  }
  if (back) {
    networks[bankIP].data.pos = 0
    clearLogs()
    addLog(line)
  }
}

// Parses commands.
function parseCommand(command) {
  var prev = filePath.slice(0,filePath.length)
  var fail = 0
  var array = command[0]
  if (command[1][0] === 0) {
    switch (array[0]) {
      case "sell": // sell value <file> / sell push <file>
        if (1 === 1) {
          if (!findFile(devices[playerHost].files, ["Users","admin","Applications","Sell.exe"], "sell")) {
            fail = 1
            break
          }
          if (array.length < 3) {
            fail = 3
            break
          }
          if (array.length > 3) {
            fail = 2
            break
          }
          if (array[1] === "value" || array[1] === "push") {
            var file = navigateObject(devices[currentMAC].files, filePath.concat(array[2]))
            if (file === undefined) {
              fail = 13
              break
            }
            console.log(file)
            if (file.lootTag === undefined) {
              addLog("The file '" + array[2] + "' is not sellable.")
              break
            }
            if (soldUIDs.includes(file.uid)) {
              addLog("The file '" + array[2] + "' has already been sold.")
              break
            }
            var value = evaluateFilePrice(file)
            if (array[1] === "value") {
              addLog("The file '" + array[2] + "' is valued at " + value + "¤.")
            } else {
              if (currentBank === "") {
                addLog("ERROR - Not logged in to bank account.")
                fail = -1
                break
              }
              networks[bankIP].data.accounts[currentBank][1] += value
              soldUIDs.push(file.uid)
              addLog("Sold '" + array[2] + "' for " + value + "¤.")
            }
          } else {
            fail = 1
            break
          }
          break
        }
      case "wepcrack": // wepcrack <IP> guess <code> / wepcrack <IP> solve <code> / wepcrack <IP> create
        if (1 === 1) {
          if (!findFile(devices[playerHost].files, ["Users","admin","Applications","WEPCrack.exe"], "wepcrack")) {
            fail = 1
            break
          }
          if (array.length < 3) {
            fail = 3
            break
          }
          if (array.length > 4) {
            fail = 2
            break
          }
          var ip = array[1]
          if (array[1] === "target") {
            ip = storedIP
          }
          if (array[1] === "127.0.0.0") {
            ip = playerNetwork
          } else {
            ip = getNumberFromIP(ip)
          }
          var mac = -1
          if (isNaN(ip)) {
            fail = 5
            break
          }
          if (networks[ip] === undefined) {
            fail = 7
            break
          }
          if (networks[ip].security !== 1) {
            addLog("ERROR - Network not using WEP security.")
            fail = -1
            break
          }
          if (array[2] === "guess" || array[2] === "solve") {
            if (array.length < 4) {
              fail = 3
              break
            }
            var code = array[3].split("")
            var fail = false
            if (code.length !== 4) {
              fail = true
            }
            for (var i of code) {
              if (!(["0","1","2","3","4","5","6","7","8","9"].includes(i))) {
                fail = true
              }
            }
            if (fail) {
              addLog("ERROR - Invalid WEP key.")
              fail = -1
              break
            }
            code = parseInt(array[3])
            if (array[2] === "guess") {
              var message = "WEP key correct."
              if (code < networks[ip].code) {
                message = "WEP key too small."
              } else if (code > networks[ip].code) {
                message = "WEP key too large."
              }
              addLoadingBar("Comparing", 1000, message)
            } else if (array[2] === "solve") {
              if (code !== networks[ip].code) {
                addLoadingBar("Solving", 3000, "WEP key incorrect.")
              } else {
                addLoadingBar("Solving", 3000, ["WEP security of " + getIP(ip) + " cracked."], "unlock", [ip])
              }
            }
          } else if (array[2] === "create") {
            if (array.length > 3) {
              fail = 2
              break
            }
            var downloads = navigateObject(devices[playerHost].files, ["Users","admin","Downloads"])
            if (downloads === undefined) {
              addLog("Folder 'Downloads' not found.")
              fail = -1
              break
            }
            if (!networks[ip].hacked) {
              addLog("ERROR - Network has not been cracked.")
              fail = -1
              break
            }
            copyFile({lootTag: "backdoor", ip: ip, uid: networks[ip].uid, type: "static"}, downloads, networks[ip].name.replace(/ /g, "_").toLowerCase().replace(/[^abcdefghijklmnopqrstuvwxyz0123456789_]/g, "") + ".wepbd")
            addLoadingBar("Downloading", 3000, "WEP backdoor file created in 'downloads'.")
            console.log(downloads)
          } else {
            fail = 1
            break
          }
          break
        }
      case "discover": // discover
        if (1 === 1) {
          if (array.length > 1) {
            fail = 2
            break
          }
          addLoadingBar("Scanning", 5000, "Discovered 3 new networks and added them as links.", "discover")
          break
        }
      case "load": // load
        if (1 === 1) {
          if (array.length > 1) {
            fail = 2
            break
          }
          if (currentLoaded.length === 0) {
            fail = -1
            addLog("ERROR - No device savestate mounted.")
            break
          }
          addLoadingBar("Loading", 5000, "","load")
          break
        }
      case "save": // save
        if (1 === 1) {
          if (array.length > 1) {
            fail = 2
            break
          }
          addLoadingBar("Saving", 5000, "Saved device state.", "save")
          break
        }
      case "bank": // bank login <name> <password> / bank logout / bank balance / bank transfer <name> <INT>
        if (1 === 1) {
          var failed = !findFile(devices[playerHost].files, ["Users","admin","Applications","Bank.exe"], "bank")
          if (failed || command[1][1] !== 0) {
            fail = 1
            break
          }
          if (array.length < 2) {
            fail = 3
            break
          }
          switch (array[1]) {
            case "login":
              if (array.length < 4) {
                fail = 3
                break
              }
              if (array.length > 4) {
                fail = 2
                break
              }
              if (currentBank !== "") {
                addLog("ERROR - Already logged in to bank account.")
                fail = -1
                break
              }
              var account = networks[bankIP].data.accounts[array[2]]
              if (account === undefined) {
                addLog("ERROR - Account name does not exist.")
                fail = -1
                break
              }
              if (account[0] !== array[3]) {
                addLog("ERROR - Password does not match account name.")
                fail = -1
                break
              }
              currentBank = array[2]
              addLog("Logged into '" + array[2] + "'.")
              break
            case "logout":
              if (array.length > 2) {
                fail = 2
                break
              }
              if (currentBank === "") {
                addLog("ERROR - Not logged in to bank account.")
                fail = -1
                break
              }
              addLog("Logged out of '" + currentBank + "'.")
              currentBank = ""
              break
            case "balance":
              if (array.length > 2) {
                fail = 2
                break
              }
              if (currentBank === "") {
                addLog("ERROR - Not logged in to bank account.")
                fail = -1
                break
              }
              addLog("Balance: " +  networks[bankIP].data.accounts[currentBank][1] + "¤")
              break
            case "transfer":
              if (array.length < 4) {
                fail = 3
                break
              }
              if (array.length > 4) {
                fail = 2
                break
              }
              if (currentBank === "") {
                addLog("ERROR - Not logged in to bank account.")
                fail = -1
                break
              }
              if (array[2] === currentBank) {
                addLog("ERROR - Cannot transfer money to self.")
                fail = -1
                break
              }
              var accounts = networks[bankIP].data.accounts
              if (accounts[array[2]] === undefined) {
                addLog("ERROR - Account name does not exist.")
                fail = -1
                break
              }
              var number = Number(array[3])
              if (number === NaN || number % 1 !== 0 || number <= 0) {
                addLog("ERROR - Invalid amount.")
                fail = -1
                break
              }
              if (accounts[currentBank][1] < number) {
                addLog("ERROR - Not enough money in bank account.")
                fail = -1
                break
              }
              accounts[currentBank][1] -= number
              accounts[array[2]][1] += number
              addLog("Transferred " + number + "¤ to '" + array[2] + "'.")
              break
            default:
              fail = 1
              break
          }
          break
        }
      case "scan": // scan <IP> devices / scan <IP> networks
        if (1 === 1) {
          if (array.length < 3) {
            fail = 3
            break
          }
          if (array.length > 3) {
            fail = 2
            break
          }
          if (command[1][1] !== 0 || (array[2] !== "devices" && array[2] !== "networks")) {
            fail = 1
            break
          }
          var ip = array[1]
          if (array[1] === "target") {
            ip = storedIP
          }
          ip = getNumberFromIP(ip)
          if (array[1] === "127.0.0.0") {
            ip = playerNetwork
          }
          if (isNaN(ip)) {
            fail = 5
            break
          }
          if (networks[ip] === undefined) {
            fail = 7
            break
          }
          var log = [": (" + getIP(ip) + ")"]
          switch (array[2]) {
            case "devices":
              var count = 0
              log[0] = "Devices" + log[0]
              for (var i in networks[ip].devices) {
                log.push(getMAC(i) + " (" + devices[i].name + ")")
                count++
              }
              if (count === 0) {
                log = "No devices found."
              }
              break
            case "networks":
              if (networks[ip].connections === undefined || networks[ip].connections.length < 1) {
                log = "No networks found."
                break
              }
              log[0] = "Networks" + log[0]
              for (var i of networks[ip].connections) {
                log.push(getIP(i) + " (" + networks[i].name + ") [" + securityNames[networks[i].security] + "]")
              }
              break
          }
          addLoadingBar("Scanning", 2000, log)
          break
        }
      case "reboot": // restart
        if (1 === 1) {
          if (array.length > 1) {
            fail = 2
            break
          }
          if (currentMAC === playerHost) {
            addLoadingBar("Restarting", 2000, "", "restart")
          } else {
            devices[currentMAC].down = true
            addEvent(5000, 0, "reboot", [currentMAC])
            connect(playerNetwork, playerHost)
            addLog("Forcefully disconnected from MAC.")
          }
          break
        }
      case "link": // link add <STR> <IP> [MAC] / link list [INT] / link target <INT> / link remove <INT> / link clear
        if (1 === 1) {
          if (array.length < 2) {
            fail = 3
            break
          }
          if (command[1][1] !== 0) {
            fail = 1
            break
          }
          switch (array[1]) {
            case "add":
              if (array.length < 4) {
                fail = 3
                break
              }
              if (array.length > 5) {
                fail = 2
                break
              }
              if (bookmarks.length > 255) {
                addLog("ERROR - Link capacity reached.")
                fail = -1
                break
              }
              if (array[2].length > 64) {
                fail = 17
                break
              }
              if (isNaN(getNumberFromIP(array[3]))) {
                fail = 5
                break
              }
              if (array[3] === "127.0.0.0") {
                array[3] = getIP(playerNetwork)
              }
              if (array.length > 4) {
                if (isNaN(getNumberFromMAC(array[4]))) {
                  fail = 6
                  break
                }
                bookmarks.push([array[2], array[3], array[4].toUpperCase()])
              } else {
                bookmarks.push([array[2], array[3]])
              }
              addLog("Link \"" + array[2] + "\" added.")
              break
            case "list":
              if (array.length > 3) {
                fail = 2
                break
              }
              if (bookmarks.length < 1) {
                addLog("No links found.")
                fail = -1
                break
              }
              var data = []
              for (var i = 0; i < bookmarks.length; i++) {
                var string = "[" + i + "] " + bookmarks[i][0] + ": "
                if (bookmarks[i].length > 2) {
                  string += bookmarks[i][2] + " (" + bookmarks[i][1] + ")"
                } else {
                  string += bookmarks[i][1]
                }
                data.push(string)
              }
              var index = 1
              if (array.length > 2 && !isNumber(array[2],-1)) {
                fail = 12
                break
              }
              if (array.length > 2) {
                index = Number(array[2])
              }
              var list = printHelp("Links:", data, index, 10)
              if (list !== null) {
                addLoadingBar("Collecting", 300, list)
              } else {
                fail = 12
                break
              }
              break
            case "target":
              if (array.length < 3) {
                fail = 3
                break
              }
              if (array.length > 3) {
                fail = 2
                break
              }
              if (bookmarks[array[2]] === undefined) {
                fail = 12
                break
              }
              if (bookmarks[array[2]].length < 3) {
                storedIP = bookmarks[array[2]][1]
                storedMAC = ""
                addLog("Set target to " + bookmarks[array[2]][1] + ".")
              } else {
                storedIP = bookmarks[array[2]][1]
                storedMAC = bookmarks[array[2]][2]
                addLog("Set target to " + bookmarks[array[2]][2] + " (" + bookmarks[array[2]][1] + ").")
              }
              break
            case "remove":
              if (array.length < 3) {
                fail = 3
                break
              }
              if (array.length > 3) {
                fail = 2
                break
              }
              if (bookmarks[array[2]] === undefined) {
                fail = 12
                break
              }
              bookmarks.splice(array[2], 1)
              addLog(["Deleted link #" + array[2] + "."])
              break
            case "clear":
              if (array.length > 2) {
                fail = 2
                break
              }
              if (bookmarks.length < 1) {
                addLog("ERROR - No links to clear.")
                fail = -1
                break
              }
              bookmarks = []
              addLoadingBar("Collecting", 1000, "Cleared links.")
              break
            default:
              fail = 1
              break
          }
          break
        }
      case "cmd": // cmd list [INT] / cmd run <file>
        if (1 === 1) {
          if (array.length < 2) {
            fail = 3
            break
          }
          if (array.length > 3) {
            fail = 2
            break
          }
          if (command[1][1] !== 0) {
            fail = 1
            break
          }
          var programs = navigateObject(devices[playerHost].files, ["Users", "admin","Documents","Programs"])
          if (programs === undefined) {
            addLog("ERROR - Folder 'Programs' not found.")
            fail = -1
            break
          }
          switch (array[1]) {
            case "list":
              var data = []
              for (var i in programs) {
                if (i.length > 4) {
                  if (i.slice(i.length - 4, i.length) === ".cmd" && (programs[i].type === "dynamic" || programs[i].type === "readonly")) {
                    data.push(i.slice(0,i.length - 4))
                  }   
                }
              }
              if (data.length === 0) {
                addLog("No programs found.")
                fail = -1
                break
              }
              var index = 1
              if (array.length > 2 && !isNumber(array[2],-1)) {
                fail = 12
                break
              }
              if (array.length > 2) {
                index = Number(array[2])
              }
              var list = printHelp("Programs:", data, index, 10)
              if (list !== null) {
                addLoadingBar("Collecting", 300, list)
              } else {
                fail = 12
                break
              }
              break
            case "run":
              if (array.length < 3) {
                fail = 3
                break
              }
              array[2] += ".cmd"
              if (programs[array[2]] === undefined || (programs[array[2]].type !== "dynamic" && programs[array[2]].type !== "readonly")) {
                addLog("ERROR - Program does not exist.")
                fail = -1
                break
              }
              addLoadingBar("Running", 1000, "", "doCmd", [programs[array[2]].data])
              break
            default:
              fail = 1
              break
          }
          break
        }
      case "paste": // paste
        if (1 === 1) {
          if (array.length > 1) {
            fail = 2
            break
          }
          if (storedFile === null) {
            addLog("ERROR - Nothing copied to be pasted.")
            fail = -1
            break
          }
          var pos = navigateObject(devices[currentMAC].files, filePath)
          copyFile(storedFile[1], pos, storedFile[0])
          addLoadingBar("Pasting", 1000, "Pasted 1 object.")
          break
        }
      case "copy": // copy <file>
        if (1 === 1) {
          if (array.length < 2) {
            fail = 3
            break
          }
          if (array.length > 2) {
            fail = 2
            break
          }
          var pos = navigateObject(devices[currentMAC].files, filePath)
          if (pos[array[1]] !== undefined) {
            storedFile = [array[1],pos[array[1]]]
            addLoadingBar("Copying", 500, "Copied object to clipboard.")
          } else {
            fail = 13
            break
          }
          break
        }
      case "name": // name <file> <STR>
        if (1 === 1) {
          if (array.length < 3) {
            fail = 3
            break
          }
          if (array.length > 3) {
            fail = 2
            break
          }
          var pos = navigateObject(devices[currentMAC].files, filePath)
          if (pos[array[1]] !== undefined) {
            var file = pos[array[1]]
            delete pos[array[1]]
            copyFile(file, pos, array[2])
            addLog("Renamed 1 object.")
          } else {
            fail = 13
            break
          }
          break
        }
      case "dup": // dup <file> [STR]
        if (1 === 1) {
          if (array.length < 2) {
            fail = 3
            break
          }
          if (array.length > 3) {
            fail = 2
            break
          }
          var pos = navigateObject(devices[currentMAC].files, filePath)
          if (pos[array[1]] !== undefined) {
            var name = array[1]
            if (array.length === 3) {
              name = array[2]
            }
            copyFile(pos[array[1]], pos, name)
            addLoadingBar("Duplicating", 1500, "Duplicated 1 object.")
          } else {
            fail = 13
            break
          }
          break
        }
      case "scp": // scp <file>
        if (1 === 1) {
          if (array.length < 2) {
            fail = 3
            break
          }
          if (array.length > 2) {
            fail = 2
            break
          }
          var downloads = navigateObject(devices[playerHost].files, ["Users","admin","Downloads"])
          if (downloads === undefined || downloads.type !== undefined) {
            addLog("ERROR - Folder 'Downloads' nonexistant.")
            fail = -1
            break
          }
          var pos = navigateObject(devices[currentMAC].files, filePath)
          if (array[1] === "*" && command[1][1] === 0) {
            var newPos = decouple(pos)
            var count = 0
            for (var i in newPos) {
              copyFile(newPos[i], downloads, i)
              count++
            }
            if (count === 0) {
              addLoadingBar("Grabbing", 300, "No items copied.")
            } else if (count === 1) {
              addLoadingBar("Grabbing", 3000, "Copied 1 item to Downloads.")
            } else {
              addLoadingBar("Grabbing", 3000 * count, "Copied " + count + " items to Downloads.")
            }
          } else if (pos[array[1]] !== undefined) {
            copyFile(pos[array[1]], downloads, array[1])
            addLoadingBar("Grabbing", 3000, "Copied 1 item to Downloads.")
          } else {
            fail = 13
            break
          }
          break
        }
      case "file": // file <file> add <STR> / file <file> remove <INT> / file <file> edit <INT> <STR>
        if (1 === 1) {
          if (array.length > 5) {
            fail = 2
            break
          }
          if (array.length < 4) {
            fail = 3
            break
          }
          if (command[1][2] !== 0) {
            fail = 1
            break
          }
          var pos = navigateObject(devices[currentMAC].files, filePath)
          var found = false
          if (pos[array[1]] !== undefined) {
            if (pos[array[1]].type === "dynamic") {
              found = true
            }
          }
          if (!found) {
            fail = 11
            break
          }
          switch (array[2]) {
            case "add":
              if (array.length > 4) {
                fail = 2
                break
              }
              if (pos[array[1]].data.length >= 255) {
                addLog("ERROR - File capacity reached.")
                fail = -1
                break
              }
              pos[array[1]].data.push(array[3])
              addLog("Added 1 line to file.")
              break
            case "remove":
              if (array.length > 4) {
                fail = 2
                break
              }
              var failed = true
              var index = Number(array[3])
              if (!isNaN(index) && index < 256 && index >= 0 && pos[array[1]].data[index] !== undefined) {
                failed = false
              }
              if (failed) {
                fail = 12
                break
              }
              pos[array[1]].data.splice(index,1)
              addLog("Removed 1 line from file.")
              break
            case "edit":
              if (array.length < 5) {
                fail = 2
                break
              }
              var failed = true
              var index = Number(array[3])
              if (!isNaN(index) && index < 255 && index >= 0 && pos[array[1]].data[index] !== undefined) {
                failed = false
              }
              if (failed) {
                fail = 12
                break
              }
              if (array[4].length >= 255) {
                addLog("ERROR - Line capacity reached.")
                fail = -1
                break
              }
              pos[array[1]].data[index] = array[4]
              addLog("Edited 1 line on file.")
              break
            default:
              fail = 1
              break
          }
          break
        }
      case "make": // make folder <STR> / make file <STR>
        if (1 === 1) {
          if (array.length > 3) {
            fail = 2
            break
          }
          if (array.length < 3) {
            fail = 3
            break
          }
          if (command[1][0] !== 0) {
            fail = 1
            break
          }
          var pos = navigateObject(devices[currentMAC].files, filePath)
          if (pos[array[2]] === undefined) {
            switch (array[1]) {
              case "folder":
                pos[array[2]] = {}
                break
              case "file":
                pos[array[2]] = {type:"dynamic", data:[]}
            }
            addLoadingBar("Creating", 2500, "Created 1 new file.")
          } else {
            addLog(["ERROR - Name overlaps with object in current folder."])
            fail = -1
            break
          }
          break
        }
      case "rm": // rm <file>
        if (1 === 1) {
        if (array.length > 2) {
          fail = 2
          break
        }
        if (array.length < 2) {
          fail = 3
          break
        }
        var count = 1
        var pos = navigateObject(devices[currentMAC].files, filePath)
        if (array[1] === "*" && command[1][1] === 0) {
          count--
          for (var i in pos) {
            delete pos[i]
            count++
          }
        } else {
          if (pos[array[1]] === undefined) {
            fail = 13
            break
          }
          delete pos[array[1]]
        }
        if (count === 0) {
          addLog("No files deleted.")
        } else if (count === 1) {
          addLoadingBar("Deleting", 1500, "Deleted 1 file.")
        } else {
          addLoadingBar("Deleting", 1500 * count, "Deleted " + count + " files.")
        }
        break
        }
      case "read": // read <file> [INT]
        if (1 === 1) {
        if (array.length > 3) {
          fail = 2
          break
        }
        if (array.length < 2) {
          fail = 3
          break
        }
        var pos = navigateObject(devices[currentMAC].files, filePath)
        var failed = true
        if (pos[array[1]] !== undefined) {
          if (pos[array[1]].type !== undefined) {
            failed = false
          }
        }
        if (failed) {
          fail = 11
          break
        }
        if (pos[array[1]].type !== "dynamic" && pos[array[1]].type !== "readonly") {
          addLog("ERROR - File is not readable.")
          fail = -1
          break
        }
        var value = 0
        if (array.length === 3) {
          if (isNaN(Number(array[2]))) {
            fail = 12
            break
          }
          value = Number(array[2])
        }
        if (value >= pos[array[1]].data.length || !isNumber(value,0)) {
          fail = 12
          break
        }
        var temp = [array[1] + ":"]
        for (var i = value; i < pos[array[1]].data.length; i++) {
          temp.push(i + ". " + pos[array[1]].data[i])
        }
        addLog(temp)
        break
        }
      case "notes": // notes add <STR> / notes read <INT> / notes remove <INT> / notes list [INT] / notes clear
        if (1 === 1) {
        var admin = navigateObject(devices[playerHost].files, ["Users", "admin"])
        var failed = !findFile(devices[playerHost].files, ["Users","admin","Applications","Notes.exe"], "notes")
        if (failed) {
          fail = 1
          break
        }
        if (array.length === 1) {
          fail = 3
          break
        }
        if (array.length > 3) {
          fail = 2
          break
        }
        failed = true
        var temp = navigateObject(admin, ["Documents", "notes.txt"])
        if (temp !== undefined) {
          if (temp.type === "dynamic") {
            failed = false
          }
        }
        if (failed) {
          if (navigateObject(admin, ["Documents"]) !== undefined) {
            admin.Documents["notes.txt"] = {type: "dynamic", data: []}
          } else {
            addLog("ERROR - Folder 'Documents' not found.")
            fail = -1
            break
          }
        }
        admin = navigateObject(admin, ["Documents", "notes.txt"])
        if (command[1][1] === 0) {
          switch (array[1]) {
            case "add":
              if (array.length !== 3) {
                fail = 3
                break
              }
              if (admin.data.length >= 255) {
                addLog("ERROR - File capacity reached.")
                fail = -1
                break
              }
              admin.data.push(array[2])
              addLog("Added 1 note.")
              break
            case "read":
              if (array.length !== 3) {
                fail = 3
                break
              }
              failed = true
              var index = Number(array[2])
              if (!isNaN(index) && index < 256 && index >= 0 && admin.data[index] !== undefined) {
                failed = false
              }
              if (failed) {
                fail = 12
                break
              }
              addLog(admin.data[index],true)
              break
            case "remove":
              if (array.length !== 3) {
                fail = 3
                break
              }
              failed = true
              var index = Number(array[2])
              if (!isNaN(index) && index < 256 && index >= 0 && admin.data[index] !== undefined) {
                failed = false
              }
              if (failed) {
                fail = 12
                break
              }
              admin.data.splice(index,1)
              addLoadingBar("Deleting", 500, "Removed 1 note.")
              break
            case "list":
              if (array.length > 3) {
                fail = 2
                break
              }
              var value = 0
              if (array.length === 3) {
                if (isNaN(Number(array[2]))) {
                  fail = 12
                  break
                }
                value = Number(array[2])
              }
              if (admin.data.length === 0) {
                addLog("No notes found.")
                fail = -1
                break
              }
              if (value > 254 || value > admin.data.length - 1) {
                fail = 12
                break
              }
              var string = ["Notes:"]
              for (var i = value; i < admin.data.length; i++) {
                var data = admin.data[i]
                if (data.length > 5) {
                  data = data.slice(0,5) + "..."
                }
                string.push("[" + i + "] - \"" + data + "\"")
                if (i > value + 17) {
                  break
                }
              }
              addLoadingBar("Collecting", 300, string)
              break
            case "clear":
              admin.data = []
              addLoadingBar("Deleting", 500 * admin.data.length, "Cleared notes.")
              break
            default:
              fail = 1
              break
          }
        } else {
          fail = 1
          break
        }
        break
        }
      case "info": // info <IP> [MAC] / info current / info target
        if (1 === 1) {
        if (array.length === 2 && array[1] === "current" && command[1][1] === 0) {
          array.pop()
          array.push(getIP(currentIP), getMAC(currentMAC))
        }
        if (array.length === 2 && array[1] === "target" && command[1][1] === 0) {
          array.pop()
          if (storedIP === "") {
            fail = 14
            break
          } else {
            array.push(storedIP)
          }
          if (storedMAC !== "") {
            array.push(storedMAC)
          }
        }
        if (array.length < 2) {
          fail = 3
          break
        }
        if (array.length > 3) {
          fail = 2
          break
        }
        var ip = getNumberFromIP(array[1])
        if (array[1] === "127.0.0.0") {
          ip = playerNetwork
        }
        if (isNaN(ip)) {
          fail = 5
          break
        }
        if (networks[ip] === undefined) {
          fail = 7
          break
        }
        var message = [networks[ip].name + ": (" + getIP(ip) + ") [" + securityNames[networks[ip].security] + "]", networks[ip].description]
        if (array.length === 3) {
          var mac = getNumberFromMAC(array[2])
          if (isNaN(mac)) {
            fail = 6
            break
          }
          if (networks[ip].devices[mac] === undefined || devices[mac].down === true) {
            fail = 8
            break
          }
          if (networks[ip].devices[mac] === false) {
            fail = 9
            break
          }
          message.push(devices[mac].name + ": (" + getMAC(mac) + ")", devices[mac].description)
        }
        addLoadingBar("Grabbing", 500, message)
        break
        }
      case "disconnect": // disconnect
        if (1 === 1) {
          if (array.length > 1) {
            fail = 2
            break
          }
          if (currentIP === playerNetwork && currentMAC === playerHost) {
            addLog("ERROR - Cannot disconnect from self.")
            fail = -1
            break
          }
          var object = "MAC"
          if (currentMAC === -1) {
            object = "IP"
          }
          disconnect()
          break
        }
      case "connect": // connect <IP> [MAC] / connect target
        if (1 === 1) {
        if (array.length === 2 && array[1] === "target" && command[1][1] === 0) {
          array.pop()
          if (storedIP === "" && storedMAC === "") {
            fail = 14
            break
          }
          array.push(storedIP)
          if (storedMAC !== "") {
            array.push(storedMAC)
          }
        }
        if (array.length < 2) {
          fail = 3
          break
        }
        if (array.length > 3) {
          fail = 2
          break
        }
        var ip = getNumberFromIP(array[1])
        if (array[1] === "127.0.0.0") {
          array[1] = getIP(playerNetwork)
          ip = playerNetwork
        }
        var mac = -1
        if (isNaN(ip)) {
          fail = 5
          break
        }
        if (networks[ip] === undefined) {
          fail = 7
          break
        }
        if (array.length > 2) {
          mac = getNumberFromMAC(array[2])
          if (isNaN(mac)) {
            fail = 6
            break
          }
          if (networks[ip].devices[mac] === undefined || devices[mac].down === true) {
            fail = 8
            break
          }
          if (networks[ip].devices[mac] === false) {
            fail = 9
            break
          }
          addLoadingBar("Connecting", 2000, "Connected to " + array[2].toUpperCase() + " (" + array[1] + ").", "connect", [ip, mac])
        } else {
          if (networks[ip].instance === undefined) {
            addLog("ERROR - Network cannot be connected to.")
            fail = -1
            break
          }
          addLoadingBar("Connecting", 2000, "", "connect", [ip, mac])
        }
        break
        }
      case "target": // target <IP> [MAC]
        if (1 === 1) {
        if (array.length < 2) {
          fail = 3
          break
        }
        if (array.length > 3) {
          fail = 2
          break
        }
        if (isNaN(getNumberFromIP(array[1]))) {
          fail = 5
          break
        }
        if (array.length > 2) {
          if (isNaN(getNumberFromMAC(array[2]))) {
            fail = 6
            break
          }
        }
        if (array.length === 2) {
          storedIP = array[1]
          storedMAC = ""
          addLog("Set target to " + array[1] + ".")
        } else {
          storedIP = array[1]
          storedMAC = array[2]
          addLog("Set target to " + array[2] + " (" + array[1] + ").")
        }
        break
        }
      case "ls": // ls [INT]
        if (1 === 1) {
        if (array.length > 2) {
          fail = 2
          break
        }
        var pos = navigateObject(devices[currentMAC].files, filePath)
        var data = []
        for (var i in pos) {
          var type = pos[i].type
          switch (type) {
            case undefined:
              type = "(folder)"
              break
            case "static":
              type = "(file)"
              break
            case "dynamic":
              type = "(editable file)"
              break
            default:
              type = "(unknown)"
          }
          data.push(i + " " + type)
        }
        if (data.length === 0) {
          addLog("No files found.")
          fail = -1
          break
        }
        var index = 1
        if (array.length > 1 && !isNumber(array[1],-1)) {
          fail = 12
          break
        }
        if (array.length > 1) {
          index = Number(array[1])
        }
        var list = printHelp(getFilePath(filePath), data, index, 10)
        if (list !== null) {
          addLoadingBar("Collecting", 300, list)
        } else {
          fail = 12
          break
        }
        break
        }
      case "cd": // cd [directory]
        if (1 === 1) {
        if (array.length > 2) {
          fail = 2
          break
        }
        if (array.length === 1) {
          setFilePath(["Users","admin"])
          break
        }
        if (array.length === 2) {
          var done = false
          if (command[1][1] === 0) {
            switch (array[1]) {
              case "/":
                setFilePath([])
                done = true
                break
              case "~":
                setFilePath(["Users","admin"])
                done = true
                break
              case ".":
                done = true
                break
              case "..":
                setFilePath(filePath.slice(0,filePath.length - 1))
                done = true
                break
              case "-":
                setFilePath(prevFilePath)
                done = true
                break
            }
          }
          if (done) {
            break
          }
          var tempPath = [undefined]
          switch (array[1].slice(0,1)) {
            case "/":
              tempPath = quoteSplit(array[1].slice(1,array[1].length),"/")[0]
              break
            case "~":
              tempPath = ["Users","admin"].concat(quoteSplit(array[1].slice(1,array[1].length),"/")[0])
              break
            default:
              tempPath = filePath.concat(quoteSplit(array[1],"/")[0])
          }
          var pos = devices[currentMAC].files
          for (var i of tempPath) {
            if (pos[i] === undefined) {
              fail = 4
              break
            } else if (pos[i].type !== undefined) {
              fail = 4
              break
            } else {
              pos = pos[i]
            }
          }
          if (fail === 0) {
            setFilePath(tempPath)
          }
          break
        }
        }
      case "help": // help [command] / help basic [INT] / help apps [INT]
        if (1 === 1) {
          if (array.length > 3) {
            fail = 2
            break
          }
          failed = false
          if (array.length === 1) {
            addLog(["Type \'help basic\' for a list of basic commands.","Type \'help apps\' for a list of commands related to applications.","Type \'help <command>\' to read specific details on a given command."])
          } else {
            var index = 1
            if (array.length > 2 && !isNumber(array[2],-1)) {
              fail = 12
              break
            }
            if (array.length > 2) {
              index = Number(array[2])
            }
            var help
            switch (array[1]) {
              case "basic":
                if (command[1][1] !== 0) {
                  failed = true
                  break
                }
                help = printHelp("Basic Commands:",["help","ls","cd","rm","connect","disconnect","read","make","file","target","scp","dup","name","copy","paste","cmd","link","reboot","scan","save","load","discover"], index)
                if (help !== null) {
                  addLoadingBar("Collecting", 300, help)
                }
                break
              case "apps":
                if (command[1][1] !== 0) {
                  failed = true
                  break
                }
                var array = []
                var applications = ["Users","admin","Applications"]
                var appCommands = {"Notes.exe": {tag: "notes", commands: ["notes"]}, "Bank.exe": {tag: "bank", commands: ["bank"]}, "WEPCrack.exe": {tag: "wepcrack", commands: ["wepcrack"]}, "Sell.exe": {tag: "sell", commands: ["sell"]}}
                for (var i in appCommands) {
                  var path = decouple(applications)
                  path.push(i)
                  if (findFile(devices[playerHost].files, path, appCommands[i].tag)) {
                    array = array.concat(appCommands[i].commands)
                  }
                }
                if (array.length < 1) {
                  addLog("No application commands found.")
                  break
                }
                help = printHelp("Application Commands:", array, index)
                if (help !== null) {
                  addLoadingBar("Collecting", 300, help)
                }
                break
              default:
                failed = true
            }
            if (help === null) {
              fail = 12
              break
            }
          }
          if (failed) {
            if (array.length > 2) {
              fail = 2
              break
            }
            var helpData = {"help": {"": "Logs information about the \'help\' command.", "[command]": "Logs information about [command].", "basic [INT]": "Logs a list of the basic system commands on your machine. Displays commands in pages of 5 commands each. [INT] is used to specify the page.", "apps [INT]": "Logs a list of the commands from applications on your machine. Displays commands in pages of 5 commands each. [INT] is used to specify the page."}}
            var appHelp = {"notes": {"add <STR>": "Adds a new note with <STR> as contents.", "read <INT>": "Reads the note with the id <INT>.", "remove <INT>": "Removes the note with the id <INT>.", "list [INT]": "Lists all notes starting from [INT].", "clear": "Deletes all notes."}}
            var appCommands = {"Notes.exe": {tag: "notes", commands: ["notes"]}}
            var applications = ["Users","admin","Applications"]
            for (var i in appCommands) {
              var path = applications
              path.push(i)
              if (findFile(devices[playerHost].files, path, appCommands[i].tag)) {
                for (var j in appCommands[i].commands) {
                  var command = appCommands[i].commands[j]
                  helpData[command] = appHelp[command]
                }
              }
            }
            var found = false
            for (var i in helpData) {
              if (i === array[1]) {
                found = true
                var log = []
                for (var j in helpData[i]) {
                  var string = i + ""
                  if (j !== "") {
                    string += " "
                  }
                  string += j + ": " + helpData[i][j]
                  log.push(string)
                }
                addLog(log)
                break
              }
            }
            if (found === false) {
              fail = -1
              addLog(["ERROR - Command help not found."])
            }
          }
          break
        }
      default:
        fail = 1
    }
  } else {
    fail = 1
  }
  switch (fail) {
    case 0:
      if (JSON.stringify(filePath) !== JSON.stringify(prev)) {
        prevFilePath = prev
      }
      break
    case 1:
      addLog("ERROR - Unknown command.")
      break
    case 2:
      addLog("ERROR - Too many arguments.")
      break
    case 3:
      addLog("ERROR - Too few arguments.")
      break
    case 4:
      addLog("ERROR - Directory does not exist.")
      break
    case 5:
      addLog("ERROR - Invalid IP address.")
      break
    case 6:
      addLog("ERROR - Invalid MAC address.")
      break
    case 7:
      addLog("ERROR - IP address not found.")
      break
    case 8:
      addLog("ERROR - MAC address not found.")
      break
    case 9:
      addLog("ERROR - MAC access denied.")
      break
    case 10:
      addLog("ERROR - Not connected to a device.")
      break
    case 11:
      addLog("ERROR - File does not exist.")
      break
    case 12:
      addLog("ERROR - Invalid index.")
      break
    case 13:
      addLog("ERROR - Object does not exist.")
      break
    case 14:
      addLog("ERROR - No selected device / network.")
      break
    case 15:
      addLog("ERROR - No selected device.")
      break
    case 16:
      addLog("ERROR - No selected network.")
      break
    case 17:
      addLog("String length out of range.")
  }
}

// Runs a .cmd file.
function doCmd(file) {
  if (file.length === 0) {
    addLog("ERROR - No commands to run.")
  } else {
    commandQueue = commandQueue.concat(file)
  }
}

// Add multiple bookmarks. For quest use.
function addBookmarks(array) {
  var count = 0
  for (var i of array) {
    if (bookmarks.length < 256) {
      count++
      bookmarks.push(i)
    } else {
      return false
    }
  }
  addLog("Added " + count + " bookmarks.")
  return true
}

// Render a loading bar.
function doLoadBar() {
  var num = Math.round(loadTime / loadMax * 25)
  var string = "["
  for (var i = 0; i < 25 - num; i++) {
    string += "#"
  }
  for (var i = 0; i < num; i++) {
    string += "-"
  }
  logs[logs.length - 1].innerHTML = loadTitle + ": " + string + "]"
}

// Create a loading bar with a title, time and end message.
function addLoadingBar(title, time, end, funct = "", data = []) {
  addLog(title + ": [-------------------------]")
  pauseReason = "loading"
  loadTime = time
  loadMax = time
  loadTitle = title
  loadEndMsg = end
  loadFunction = funct
  loadData = data
}

// Copy file to target with name.
function copyFile(file, target, name) {
  var count = 0
  var extention = ""
  var inLoop = true
  while (inLoop) {
    if (target[name + extention] !== undefined) {
      count++
      extention = " (" + count + ")"
    } else {
      inLoop = false
    }
  }
  target[name + extention] = decouple(file)
}

// Decouple JSON from other JSON.
function decouple(x) {
  return JSON.parse(JSON.stringify(x))
}

// Test if file with tag exists.
function findFile(start, path, tag = "") {
  var pos = navigateObject(start, path)
  if (pos === undefined) {
    return false
  }
  var cond = true
  if (tag !== "") {
    cond = pos.tags.includes(tag)
  }
  if (pos.type !== undefined && cond) {
    return true
  }
  return false
}

// Checks if a string represents a number from 0 - 255.
function isNumber(string, offset = 0) {
  var failed = true
  var number = Number(string) + offset
  if (!isNaN(number) && number < 256 && number >= 0 && Math.floor(number) === number) {
    failed = false
  }
  return !failed
}

// Creates a help string from a number and an array.
function printHelp(title, data, number, length = 5) {
  if (data.length === 0) {
    return [title + " (Page 1 of 1)"]
  }
  number -= 1
  if (number >= data.length / length) {
    return null
  }
  var text = [title + " (Page " + (number + 1) + " of " + Math.ceil(data.length / length) + ")"]
  for (var i = length * number; i < length * number + length; i++) {
    if (i >= data.length) {
      break
    }
    text.push(data[i])
  }
  return text
}

// Navigate an object with an array and return the final destination.
function navigateObject(object, path) {
  for (var i of path) {
    if (object[i] === undefined) {
      return undefined
    }
    object = object[i]
  }
  return object
}

// Get display string of a given file path R E C U R S I V E L Y.
function getFilePath(array, string = "/", pos = 0) {
  if (pos >= array.length) {
    return string
  }
  return getFilePath(array, string + array[pos] + "/", pos + 1)
}

// Display file path on display.
function setFilePath(array) {
  var tempPath = []
  var temp = devices[currentMAC].files
  for (var i of array) {
    if (temp[i] !== undefined) {
      tempPath.push(i)
      temp = temp[i]
    } else {
      break
    }
  }
  filePath = tempPath
  fileDisplay.innerHTML = "<b>FILE: " + capLine(getFilePath(tempPath), 43) + "</b>"
}

// Caps a line of text at 'length' if it is over. Replaces the last three characters with "...".
function capLine(text, length) {
  if (text.length <= length) {
    return text
  } else {
    return text.slice(0,length-3) + "..."
  }
}

// Split a string into an array on "'s.
function quoteSplit(string, char) {
  if (string === undefined) {
    return undefined
  }
  var array = string.split("")
  var final = []
  var start = 0
  var inQuotes = false
  for (var i = 0; i < array.length; i++) {
    if (array[i] === "\"") {
      inQuotes = !inQuotes
    }
    if (!inQuotes && array[i] === char) {
      final.push(string.slice(start,i))
      start = i + 1
    } else if (i === array.length - 1) {
      final.push(string.slice(start,i + 1))
    }
  }
  var quoted = []
  for (var i = 0; i < final.length; i++) {
    var quote = 0
    if (final[i][0] === "\"" && final[i][final[i].length - 1] === "\"") {
      quote += 1
    }
    var temp = final[i]
    final[i] = final[i].replace(/["]/g,"")
    if (temp !== final[i]) {
      quote += 1
    }
    quoted.push(quote)
  }
  console.log(final, quoted)
  return [final, quoted]
}

// Anti "Bobby Tables" function.
function sanitise(string) {
  return string.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;")
}

// Print a line to the log.
function addLogLine(string,string1,isVisible=true) {
  var prevValue = string
  var prevClass = "logText " + string1
  if (isVisible) {
    prevClass += " visible"
  }
  for (var i = logs.length - 1; i >= 0; i--) {
    var tempValue = prevValue
    var tempClass = prevClass
    prevValue = logs[i].innerHTML
    prevClass = logs[i].className
    logs[i].innerHTML = tempValue
    logs[i].className = tempClass
  }
}

// Splits strings in an array every 45 characters.
function splitLog(array) {
  var final = []
  for (var i of array) {
    while (i.length > 45) {
      final.push(i.slice(0,45))
      i = i.slice(45)
    }
    final.push(i)
  }
  return final
}

// Print a string to the log.
function addLog(array) {
  if (typeof array === "string") {
    array = [array]
  }
  array = splitLog(array)
  for (var i = 0; i < array.length; i++) {
    array[i] = sanitise(array[i])
  }
  addLogLine("","noBorder",false)
  if (array.length > 1) {
    addLogLine(array[0],"topBorder")
    for (var i = 1; i < array.length; i++) {
      if (i === array.length - 1) {
        addLogLine(array[i],"bottomBorder")
      } else {
        addLogLine(array[i],"noBorder")
      }
    }
  } else {
    addLogLine(array[0],"bothBorder")
  }
}

// Clear the log.
function clearLogs() {
  for (var i = logs.length - 1; i >= 0; i--) {
    logs[i].innerHTML = ""
    logs[i].className = "logText noBorder"
  }
}

// Get a random item from an array.
function randomChoice(array) {
  return array[randomRange(0, array.length - 1)]
}

// Get a random number in a range.
function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Saves the current gamestate.
function save() {
  var file = [[],prevCommands,currentPos,networks,devices,currentIP,currentMAC,currentBank,filePath,prevFilePath,playerNetwork,playerHost,storedIP,storedMAC,storedFile,bookmarks,usedIPs,bankIP,shopIP,fenceIP,events,currentUID,soldUIDs]
  for (var i = 0; i < logs.length; i++) {
    file[0].push([logs[i].innerHTML, logs[i].className])
  }
  file[0].shift()
  file[0].shift()
  file[0].push(["", "logText noBorder"], ["Saved computer state.", "logText bothBorder visible"])
  download("save.hck", JSON.stringify(file))
}

// Downloads a file.
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Stores current loaded save file.
var currentLoaded = []

// Mounts a save file to currentLoaded.
function mount(event) {
  var file = event.target.files[0]
  if (file) {
    var reader = new FileReader()
    reader.onload = function(event) { 
      var contents = event.target.result
      currentLoaded = JSON.parse(contents)
    }
    reader.readAsText(file)
  } else { 
    console.warn("Failed to load file.")
  }
}

function unlock(ip) {
  networks[ip].hacked = true
  for (var i in networks[ip].devices) {
    networks[ip].devices[i] = true
  }
}

function discover() {
  var ips = []
  for (var i = 0; i < 3; i++) {
    ips.push(addNewNetwork())
  }
  for (var i of ips) {
    var network = networks[i]
    var ipStr = getIP(i)
    addLog([network.name + ": (" + ipStr + ") [" + securityNames[network.security] + "]",network.description])
    bookmarks.push([network.name, ipStr])
  }
}

// Loads the mounted save file.
function load() {
  for (var i = 0; i < currentLoaded[0].length; i++) {
    logs[i].innerHTML = currentLoaded[0][i][0]
    logs[i].className = currentLoaded[0][i][1]
  }
  prevCommands = currentLoaded[1]
  currentPos = currentLoaded[2]
  networks = currentLoaded[3]
  devices = currentLoaded[4]
  connect(currentLoaded[5],currentLoaded[6])
  currentBank = currentLoaded[7]
  setFilePath(currentLoaded[8])
  prevFilePath = currentLoaded[9]
  playerNetwork = currentLoaded[10]
  playerHost = currentLoaded[11]
  storedIP = currentLoaded[12]
  storedMAC = currentLoaded[13]
  storedFile = currentLoaded[14]
  bookmarks = currentLoaded[15]
  usedIPs = currentLoaded[16]
  bankIP = currentLoaded[17]
  shopIP = currentLoaded[18]
  fenceIP = currentLoaded[19]
  events = currentLoaded[20]
  currentUID = currentLoaded[21]
  soldUIDs = currentLoaded[22]
}

// Initialising game data variables.
var networks = {} //
var devices = {} //
var currentIP //
var currentMAC //
var currentBank = "" //
var filePath //
var prevFilePath // 
var playerNetwork = 0 //
var playerHost = 0 //
var storedIP = "" //
var storedMAC = "" //
var storedFile = null //
var instance = null
var bookmarks = [] //
var usedIPs = {} //
var bankIP = 0 //
var shopIP = 0 //
var fenceIP = 0 //

// Get a random ephemeral port.
function randomPort() {
  return randomRange(49152, 65535)
}

// Turn an IP string into a number.
function getNumberFromIP(ip) {
  var array = ip.split(".")
  var number = 0
  if (array.length !== 4) {
    return NaN
  }
  for (var i = 3; i >= 0; i--) {
    if (array[i] < 0 || array[i] > 255 || typeof parseInt(array[i]) !== "number") {
      return NaN
    }
    number += (256 ** (3 - i)) * array[i]
  }
  return number
}

// Turn a number into an IP string.
function getIP(number) {
  var ip = ""
  for (var i = 0; i < 4; i++) {
    var pos = (256 ** (3 - i))
    var temp = Math.floor(number / pos)
    ip += temp
    number -= temp * pos
    if (i < 3) {
      ip += "."
    }
  }
  return ip
}

// IP ranges not allowed to be chosen. Formatted as [start (inclusive),length]. Sorted from lowest to highest.
var bannedIPs = [[0,16777216],[167772160,16777216],[1681915904,4194304],[2130706432,16777216],[2851995648,65536],[2886729728,1048576],[3221225472,256],[3221225984,256],[3227017984,256],[3232235520,65536],[3323068416,131072],[3325256704,256],[3405803776,256],[3758096384,268435456],[4026531840,268435455],[4294967295,1]]

// Sum of the lengths of all banned IP ranges.
var bannedIPLength = 0
for (var i of bannedIPs) {
  bannedIPLength += i[1]
}

// Generate a random IP.
function randomIP() {
  var rand = 0
  var found = false
  while (!found) {
    rand = randomRange(0, (256 ** 4 - (bannedIPLength + 1)))
    for (var i of bannedIPs) {
      if (rand >= i[0]) {
        rand += i[1]
      }
    }
    if (networks[rand] === undefined) {
      found = true
    }
  }
  return rand
}

// Turn an MAC string into a number.
function getNumberFromMAC(mac) {
  mac = mac.toUpperCase()
  if (mac.length !== 17 || mac[2] !== ":" || mac[5] !== ":" || mac[8] !== ":" || mac[11] !== ":" || mac[14] !== ":") {
    return NaN
  }
  var hex = mac.replace(/:/g, "")
  var add = ""
  for (var i = 0; i < hex.length; i++) {
    if (hex[i] === "0") {
      add += "0"
    } else {
      break
    }
  }
  var parsed = parseInt(hex, 16)
  if (add + parsed.toString(16).toUpperCase() !== hex) {
    return NaN
  }
  return parsed
}

// Turn a number into an MAC string.
function getMAC(number) {
  var array = Number(number).toString(16).toUpperCase().split("")
  while (array.length < 12) {
    array.unshift("0")
  }
  var hex = ""
  for (var i = 1; i < array.length; i += 2) {
    hex += array[i-1] + array[i]
    if (i !== array.length - 1) {
      hex += ":"
    }
  }
  return hex
}

// Generate a random MAC address.
function randomMAC() {
  var mac = 0
  var found = false
  while (!found) {
    mac = randomRange(0, 281474976710655)
    if (devices[mac] === undefined && (mac < 1577058304 || mac > 1593835519) && (mac < 1101088686080 || mac > 1101105463295)) {
      found = true
    }
  }
  return mac
}

/*
Network Data:
name - the name of the system
description - the description of the system
security - what you need to hack it
logs - what connections have happened on this network
instance - the instance that should be opened when connecting to it
data - miscelaneous data for instances
devices - a list of devices on the network, includes accessability
connections - a list of networks connected to this one
ex.
415523267: {name: "my network", description: "it's a network", security: TBA, instance: "network1", devices: {47185647: false, 412542121: true}, connections: [415627412,42178547612,32178541726]}
*/

/*
Device Data:
down - this device exist
name - the name of the system
description - the description of the system
files - the data on the computer
ex.
22417248: {name:"my system", description: "it's a system", security: TBA, files: [FILES GO HERE]}
*/

/*
File Data:
type - the type of file (does not exist for folders)
data - the data contained within the file
tags - un-editable identifiers for the file
Types:
dynamic - can be read and written to
readonly - can be read but not written to
static - cannot be read or written to
Tags:
os - if a system does not have an os file with the name "os.bin" it does not work
notes - if a system does not have a notes file with the name "Notes.exe" the notes commands will not work.
ex.
files: {"myDocuments": {"apple": {type: "dynamic", data:["hello","i am a genius"]}}, "myApps": {"Notes.exe": {type: "static", tags: ["notes"]}}}
*/

// Creates the player network and device, the bank, and the shop.
function createStartingNetworks() {
  playerNetwork = randomIP()
  playerHost = randomMAC()
  devices[playerHost] = {name: "My Computer", description: "The computer I own.", files: getBasicFiles(), down: false}
  networks[playerNetwork] = {name: "My Network", description: "The network I own.", devices: {}, security: 5}
  networks[playerNetwork].devices[playerHost] = true
  bankIP = randomIP()
  shopIP = randomIP()
  fenceIP = randomIP()
  networks[bankIP] = {name: "Aurora Online Bank", description: "Aurora Inc.'s online, anonymous, banking system.", devices: {}, instance: "bank", data: {files: {"Bank.exe": {type: "static", tags: ["bank"]}}, accounts: {}}, connections: [shopIP], security: 5}
  networks[shopIP] = {name: "Aurora Online Shop", description: "Aurora Inc.'s online, anonymous, shopping system.", devices: {}, instance: "shop", data: {files: {"shop.cmd": {type: "dynamic", data: ["connect " + getIP(shopIP)]}}, items: [["Notes", 10, {tags: ["notes"], type: "static"}],["WEPCrack", 20, {tags: ["wepcrack"], type: "static"}]]}, connections: [bankIP], security: 5}
  networks[fenceIP] = {name: "The Fence", description: "Where hackers go to sell their loot.", devices: {}, instance: "fence", data: {files: {"Sell.exe": {type: "static", tags: ["sell"]}}}, connections: [], security: 5}
  bookmarks.push(["Aurora Bank", getIP(bankIP)], ["Aurora Shop", getIP(shopIP)], ["The Fence", getIP(fenceIP)])
  console.log(networks, devices)
}

// Returns a basic filesystem.
function getBasicFiles() {
  return {"Users":{"admin":{"Downloads":{},"Documents":{"Programs":{}},"Applications":{}}},"System":{"os.bin":{type:"static", tags:["os"]}}}
}

const fileAttr = {
  "passwords_old": [10,["passwords_#.zip"]],
  "files_old": [5,["files_#.zip"]],
  "info_old": [30,["info_#.zip"]],
  "print_log_old": [2,["print_log_#.log"]]
} // Defines file attributes based on tag. (sellPrice, [name, name...])
const deviceAttr = {
  "printer_old": [5,[["print_log_old",100,3,7]],["hb_printer_#"]],
  "desktop_old": [15,[["passwords_old",80,1,2],["files_old",100,1,3],["info_old",50,1,1]],["widnows_desktop_#"]],
  "laptop_old": [10,[["passwords_old",50,1,1],["files_old",80,1,2],["info_old",20,1,1]],["widnows_laptop_#"]],
  "archive_old": [5,[["passwords_old",100,1,2],["files_old",100,2,3],["info_old",90,1,2]],["widnows_archive_#"]]
} // Defines device attributes based on tag. (sellPrice, [[fileName, chance, min, max], [fileName, chance, min, max]...], [name, name...])
const networkAttr = {
  "home_none":[0,[["printer_old",60,1,1],["desktop_old",100,1,2]],[],["%'s Network","Tallstra@@@@@@"]],
  "home_wep":[1,[["printer_old",75,1,1],["desktop_old",100,1,2],[["archive_old",30,1,1]],["laptop_old",85,1,2]],[["archive_wep",20,1,1]],["%'s Network","Tallstra@@@@@@"]],
  "archive_wep":[1,[["archive_old",100,2,3]],[],["%'s Archive Network","TallstraArchive@@@@@@"]]
} // Defines network chances and attributes based on tag. ([[deviceName, chance, min, max], [deviceName, chance, min, max]...], [name, name...])
const networkChances = [
  [1,"home_none"],
  [2,"home_wep"]
] // List of chances for network appearences on generation.
const securityNames = ["NONE","WEP","WPA","WPA2","WPA3","AQT"]
const names = ["James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles","Christopher","Daniel","Matthew","Anthony","Donald"]
var currentUID = 0 // Current number for UIDs. Incremented whenever used.
var soldUIDs = [] // List of all UIDs on files which have been sold to the shop.

// Generate and create a new network. Returns the IP of the created network.
function addNewNetwork(networkType = "") {
  if (networkType === "") {
    networkType = networkChances[doWeightTable(networkChances)][1]
  }
  var networkArrtibutes = networkAttr[networkType]
  var network = {name: substituteText(randomChoice(networkArrtibutes[3])), description: "N/A", devices: {}, connections: [], security: networkArrtibutes[0], uid: getNewUID()}
  addSecurity(network)
  for (var i of networkArrtibutes[1]) {
    var temp = parseChance(i)
    if (temp) {
      for (var j = 0; j < temp[1]; j++) {
        var deviceArrtibutes = deviceAttr[temp[0]]
        var device = {name: substituteText(randomChoice(deviceArrtibutes[2])), description: "N/A", files: getBasicFiles(), down: false, type: temp[0]}
        for (var k of deviceArrtibutes[1]) {
          var temp1 = parseChance(k)
          if (temp1) {
            for (var l = 0; l < temp1[1]; l++) {
              device.files.Users.admin.Documents[substituteText(randomChoice(fileAttr[temp1[0]][1]))] = {type: "static", lootTag: temp1[0], uid: getNewUID()}
            }
          }
        }
        var MAC = randomMAC()
        devices[MAC] = device
        if (network.security < 1) {
          network.devices[MAC] = true
        } else {
          network.devices[MAC] = false
        }
      }
    }
  }
  for (var i of networkArrtibutes[2]) {
    var temp = parseChance(i)
    if (temp) {
      for (var j = 0; j < temp[1]; j++) {
        var ip = addNewNetwork(temp[0])
        network.connections.push(ip)
      }
    }
  }
  var IP = randomIP()
  networks[IP] = network
  return IP
}

function evaluateFilePrice(file) {
  if (file.lootTag === "backdoor") {
    var count = 0
    for (var i in networks[file.ip].devices) {
      count += deviceAttr[devices[i].type][0]
    }
    return count
  } else {
    return fileAttr[file.lootTag][0]
  }
}

// Adds security variables to a network based on it's score.
function addSecurity(network) {
  switch (network.security) {
    case 1:
      network.hacked = false
      network.code = randomRange(0,9999)
  }
}

// Return a random digit from 0 to 9 as a string. 
function randomDigit() {
  return randomRange(0,9).toString()
}
  
// Returns the current UID and increments it by one.
function getNewUID() {
  var temp = currentUID
  currentUID += 1
  return temp
}

// Parses an object with a chance and returns the object and amount.
function parseChance(object) {
  var rand = randomRange(1,100)
  if (rand <= object[1]) {
    return [object[0],randomRange(object[2],object[3])]
  }
  return false
}

// Replaces certain characters in text with randomised elements.
function substituteText(text) {
  while (true) {
    var temp = text.replace(/#/i,randomDigit()).replace(/@/i,randomRange(0,15).toString(16).toUpperCase()).replace(/%/i,randomChoice(names))
    if (temp === text) {
      return text
    }
    text = temp
  }
}

// Returns a random date from between two times.
function getRandomDate(start, end, startHour, endHour) {
  var date = new Date(+start + Math.random() * (end - start))
  var hour = startHour + Math.random() * (endHour - startHour) | 0
  date.setHours(hour)
  return date
}

// Parses a weight table and returns a random element.
function doWeightTable(table) {
  var count = 0
  for (var i of table) {
    count += i[0]
  }
  var rand = randomRange(0,count-1)
  count = 0
  for (var i = 0; i < table.length; i++) {
    count += table[i][0]
    if (count > rand) {
      return i
    }
  }
  return undefined
}

// Const for storing desired FPS.
var fps = 60

// Bool flagging if in frame.
var updating = false

// Storage variable for update function.
var updateFunction

// List of queued events.
var events = [] // stack //

// Add an event to the list.
function addEvent(delay, id, functionName, arguments=[]) {
  if (arguments.length === 0) {
    events.push([0, delay, id, functionName])
  } else {
    events.push([0, delay, id, functionName, arguments])
  }
}

// Run a function defined with strings.
function runFunct(name, args = []) {
  var string = name + "("
  if (args.length > 0) {
    for (var i of args) {
      string += JSON.stringify(i) + ","
    }
    string = string.slice(0, string.length - 1)
  }
  string += ")"
  eval(string)
}

// Runs once every 1/fps seconds.
function update() {
  if (pauseReason === null && !inParse && commandQueue.length > 0) {
    parseInput(commandQueue.shift())
  }
  if (events.length !== 0) {
    console.log(events)
  }
  if (pauseReason === "loading") {
    loadTime -= 1000/fps
    doLoadBar()
    if (loadTime <= 0) {
      pauseReason = null
      loadTime = 0
      if (loadFunction !== "") {
        runFunct(loadFunction, loadData)
      }
      if (loadEndMsg !== "") {
        var normal = true
        if (typeof loadEndMsg === "object") {
          for (var i of loadEndMsg) {
            if (typeof i === "object") {
              normal = false
            }
          }
        }
        if (normal) {
          addLog(loadEndMsg)
        } else {
          for (var i of loadEndMsg) {
            addLog(i)
          }
        }
      }
    }
  }
  var updated = [] // queue
  while (events.length > 0 && (pauseReason === null || pauseReason === "restart")) {
    var object = events.pop()
    object[0] += 1000/fps
    if (object[0] >= object[1]) {
      if (pauseReason !== "restart" || object[2] === -1) {
        if (object[4] !== undefined) {
          runFunct(object[3], object[4])
        } else {
          runFunct(object[3])
        }
      }
    } else {
      updated.push(object)
    }
  }
  while (updated.length > 0) {
    events.push(updated.shift())
  }
  updateFunction = setTimeout(update, 1000/fps)
}

// Connects to an IP or IP / MAC.
function connect(ip, mac=-1) {
  currentIP = ip
  if (ip === playerNetwork) {
    ipDisplay.innerHTML = "<b>IP: 127.0.0.0 (" + getIP(ip) + ")</b>"
  } else {
    ipDisplay.innerHTML = "<b>IP: " + getIP(ip) + "</b>"
  }
  if (mac !== -1) {
    currentMAC = mac
    macDisplay.innerHTML = "<b>MAC: " + getMAC(mac) + "</b>"
    setFilePath(["Users","admin"])
    prevFilePath = ["Users","admin"]
  } else {
    addLog("Connected to " + getIP(ip) + ".")
    enterInstance(networks[ip].instance)
    startInstance()
    macDisplay.innerHTML = "<b>MAC: XX:XX:XX:XX:XX:XX</b>"
    currentMAC = -1
  }
}

// Shuts down the player computer.
function restart() {
  prevCommands = []
  currentPos = -1
  storedIP = ""
  storedMAC = ""
  storedFile = null
  commandQueue = []
  clearLogs()
  pauseReason = "restart"
  devices[playerHost].down = true
  addEvent(5000, -1, "reboot", [playerHost])
}

// Reboots a shut down device.
function reboot(device) {
  if (device === playerHost) {
    addLoadingBar("Booting", 5000, "", "boot")
  } else {
    if (!findFile(devices[device].files, ["System","os.bin"], "os")) {
      devices[device] = {down: true}
    } else {
      addEvent(5000, 0, "bootComp", [device])
    }
  }
}

// Boots a computer.
function bootComp(device) {
  devices[device].down = false
}

// Boots the player computer.
function boot() {
  clearLogs()
  if (!findFile(devices[playerHost].files, ["System","os.bin"], "os")) {
    addLog(["ERROR - Unable to find \"os.bin\"."])
    addLoadingBar("Shutting Down", 2000, "", "die")
  } else {
    addLog("Welcome back DarthOrdo!")
  }
}

// Softlocks the game.
function die() {
  pauseReason = "dead"
  clearLogs()
  clearTimeout(updateFunction)
}

// Resets E V E R Y T H I N G.
function reset() {
  networks = {}
  devices = {}
  bookmarks = []
  createStartingNetworks()
  connect(playerNetwork, playerHost)
  prevCommands = []
  currentPos = -1
  currentBank = ""
  storedIP = ""
  storedMAC = ""
  storedFile = null
  instance = null
  pauseReason = null
  inParse = false
  commandQueue = []
  clearLogs()
  events = []
  clearTimeout(updateFunction)
  addLoadingBar("Booting", 5000, [["Welcome back DarthOrdo!"], "You have 3 new links."], "clearLogs")
  update()
}

reset()