## Auto fishing enhancements

---

## What this changes
This is a fork to add some enhancements to SoliaRdi's auto-fishing. It adds some features that I have wanted from this module and Lambda11's let-me-fish module, as well as new features that neither has. Here's the list of current and future changes:
- [x] Automatically include BAFs on blacklist.
- [x] Add and remove fish by tier
- [x] Show blacklist contents with labelling
- [ ] Auto-negotiate support
- [ ] Blacklist override if there's no space left
- [ ] Auto sell to merchant on command
- [ ] Auto dismantle on command
- [ ] Print current settings
- [ ] Tier based rod time delay
- [ ] Toolbox console notifications for when to sell

---

## Commands
The full command list is given below, including both the original commands and the new ones. The original commands are given more complete descriptions for their usage.

You can edit the delays in the YourName-ServerID.json file via notepad once you enter `/8 fish save`.

| Command  | Description | Additional Information
| ------------- | ------------- | ------------- |
| /8 fish | To enable the module. |  |
| /8 fish gmmode `mode` | Action that we take if an gm spawns near us. | Mode can be exit, lobby, stop or nothing. Default is stop. |
| /8 fish skipbaf | Skips BAF | |
| /8 fish blacklist add `link` | Add the desired item to the blacklist for auto decompose or selling. | Blacklist means, that you don't want this fishes to be dismantled or sold. |
| /8 fish blacklist remove `link` | Remove the desired item from the blacklist. | How to link is described in the note section. |
| /8 fish blacklist show | Prints out the item IDs of the fish in the blacklist as well as the tier of those fish. | Added for easier blacklist usage when farming for the daily turn-in. |
| /8 fish blacklist reset | Reset your current blacklist. | In case you want to remove everything. |
| /8 fish setrecipe | The last used recipe will be used for auto crafting. | You can click on the "create" button in the craft window while your rod is cast. It won't craft anything but it will set the last-recipe that is used by this command. |
| /8 fish selltonpc `range` | Sell fishes when your inventory is full to fishing merchant. | Maximum range between you and the npc is 6 meters. Will ignore the blacklisted fish. |
| /8 fish filetmode bank `value` | Set the value to bank fish filets after filling your inventory. | Value range is 500 - 10000. You need at least one banker scroll in vip panel or inventory. Will ignore the blacklisted fish. |
| /8 fish filetmode | Disable any interactions with filets. | Useful for switching different modes. |
| /8 fish sellscroll | Sell fishes when your inventory is full. | You need traveling merchant scroll in your inventory and additional opcodes & defs. |
| /8 fish autosalad | To enable auto using of fish salad. | Both craftable and event salad gets auto detected. |
| /8 fish reloadconf | To reload your current configuration file. | In case you are editing something manually and you are still ingame. |
| /8 fish save | To save your entered settings.  | Config file gets generates per character and are stored in the mod folder. |
| /8 fish stats| Print current fishing statistic. | Fish level, total fishes and time per fish. This stat is reset when you disable and then enable the module. |
| /8 fish debug | Debug mode of the modules current function. | Shows you decision that bot takes. |

---

## Note
- If you want to use an special bait before another one make sure it's slot is lower than the slot from the other one.
- To add an item link into the chat just press ctrl and left mouse onto the desired item.
- This repo will only contain the opcodes for the Ru and Eu version, unless someone send them to me for other regions.

---

- If you need to log them yourself use this module for logging specific packets [Packet ID Finder](https://github.com/Owyn/alex-packet-id-finder).
- If you need to log them yourself use this module for logging all client or server packets [Packets Logger](https://github.com/SoliaRdi/PacketsLogger).
- Maybe you will find opcodes here https://github.com/tera-proxy/tera-data/tree/master/map.

---

## Important Changes With The Latest Big Update
<details>
<summary>Changelog</summary>
- From now on this module will only work on Caali's Tera Proxy. Please don't ask for help in his discord tho.
<br>
- If you want to farm filet you need to use /8 fish filetmode bank since there is no drop option anymore.
<br>
- The bot is crafting baits once instead of the max. amount. One time crafting equals 10 baits.
<br>
- There is no need to use the setbait command since they get autodetected now.
