const path = require('path');
const fs = require('fs');
const moment = require('moment');

module.exports = function autoFishing(mod) {
	const ITEMS_FISHES = [
		[206400, 206401], // Tier 0
		[206402, 206403, 206436], // Tier 1
		[206404, 206405, 206437, 206438], // Tier 2
		[206406, 206407, 206439, 206440], // Tier 3
		[206408, 206409, 206410, 206441, 206442], // Tier 4
		[206411, 206412, 206413, 206443, 206444], // Tier 5
		[206414, 206415, 206416, 206417, 206445, 206446], // Tier 6
		[206418, 206419, 206420, 206421, 206447, 206448], // Tier 7
		[206422, 206423, 206424, 206425, 206449, 206450], // Tier 8
		[206426, 206427, 206428, 206429, 206430, 206452, 206451, 206453], // Tier 9
		[206431, 206432, 206433, 206434, 206435, 206454, 206455, 206456], // Tier 10
		[206500, 206501, 206502, 206503, 206504, 206505, 206506, 206507, 206508, 206509, 206510, 206511, 206512, 206513, 206514], // BAF
	];

	const ITEMS_FISHES_T0S = [206400, 206401];
	const ITEMS_FISHES_T1S = [206402, 206403, 206436];
	const ITEMS_FISHES_T2S = [206404, 206405, 206437, 206438];
	const ITEMS_FISHES_T3S = [206406, 206407, 206439, 206440];
	const ITEMS_FISHES_T4S = [206408, 206409, 206410, 206441, 206442];
	const ITEMS_FISHES_T5S = [206411, 206412, 206413, 206443, 206444];
	const ITEMS_FISHES_T6S = [206414, 206415, 206416, 206417, 206445, 206446];
	const ITEMS_FISHES_T7S = [206418, 206419, 206420, 206421, 206447, 206448];
	const ITEMS_FISHES_T8S = [206422, 206423, 206424, 206425, 206449, 206450];
	const ITEMS_FISHES_T9S = [206426, 206427, 206428, 206429, 206430, 206452, 206451, 206453];
	const ITEMS_FISHES_T10S = [206431, 206432, 206433, 206434, 206435, 206454, 206455, 206456];
	const ITEMS_FISHES_BAFS = [206500, 206501, 206502, 206503, 206504, 206505, 206506, 206507, 206508, 206509, 206510, 206511, 206512, 206513, 206514]

	const ITEMS_RODS = [
		[...range(206721, 206728)], //Fairywing Rods
		[...range(206701, 206708)], //Xermetal Rods
		[...range(206711, 206718)], //Ash Sapling Rods
		[206700], //Old Rod
	];
	const PRICES = [2, 4, 6, 8, 10, 12, 14, 16, 19, 22, 25, 50];
	const FILET_ID = 204052;
	const BAITS = {
		70271: 206000, // Bait I 0%
		70272: 206001, // Bait II 20%
		70273: 206002, // Bait III 40%
		70274: 206003, // Bait IV 60%
		70275: 206004, // Bait V 80%
		70365: 206905, // Dappled Bait 80% + 5%
		70364: 206904, // Rainbow Bait 80% + 10%
		70363: 206903, // Mechanical Worm 80% + 15%
		70362: 206902, // Enhanced Mechanical Worm 80% + 20%
		70361: 206901, // Popo Bait 80% + 25%
		70360: 206900, // Popori Bait 80% + 30%
		70281: 206005, // Red Angleworm 0%
		70282: 206006, // Green Angleworm 20%
		70283: 206007, // Blue Angleworm 40%
		70284: 206008, // Purple Angleworm 60%
		70285: 206009, // Golden Angleworm 80%
		70286: 206828, // Celisium Fragment Bait
		70379: 143188, // Event Bait I
		5000012: 143188, // Event Bait II,
		5060038: 856470, // ICEFISH BAIT
		70276: 206053,// Pilidium Bait, remove from inv and bag all others baits
		70371 : 209189 // Event Shark Bait - can only be used at Murcai Fishery
	};
	const ITEMS_BANKER = [60264, 160326, 170003, 210111, 216754];
	const ITEMS_SELLER = [160324, 170004, 210109, 60262, 60263, 160325, 170006, 210110];
	const TEMPLATE_SELLER = [9903, 9906, 1960, 1961];
	const TEMPLATE_BANKER = 1962;
	const ITEMS_SALAD = [206020, 206040];
	const flatSingle = arr => [].concat(...arr);
	let enabled = false,
		playerLocation = {},
		request = {},
		npcList = {},
		pcbangBanker = null,
		scrollsInCooldown = false,
		endSellingTimer = null,
		lastRecipe = null,
		sellItemsCount = 0,
		idleCheckTimer = null,
		hasNego = mod.manager.isLoaded('auto-nego'),
		pendingDeals = [],
		negoWaiting = false;
	let DEBUG = false;
	let hooks = [];

	let extendedFunctions = {
		'banker': {
			'C_PUT_WARE_ITEM': false,
		},
		'seller': {
			'C_STORE_SELL_ADD_BASKET': false,
			'S_STORE_BASKET': false,
			'C_STORE_COMMIT': false,
		}
	};
	let dismantle_contract_type = (mod.majorPatchVersion >= 85 ? 90 : 89);
	let statistic = [],
		startTime = null,
		endTime = null,
		lastLevel = null;

	let config, settingsPath;
	if (mod.proxyAuthor !== 'caali' || !global.TeraProxy)
		mod.warn('You are trying to use auto-fishing on an unsupported version of tera-proxy.');

	mod.game.initialize(['inventory']);
	mod.game.on('enter_game', () => {
		try {
			settingsPath = `./${mod.game.me.name}-${mod.game.serverId}.json`;
			getConfigData(settingsPath);
			for (var type in extendedFunctions) {
				for (var opcode in extendedFunctions[type]) {
					var test = mod.dispatch.protocolMap.name.get(opcode);
					if (test !== undefined && test != null) extendedFunctions[type][opcode] = true;
				}
			}
			if (config.filetmode == 'bank' && Object.values(extendedFunctions.banker).some(x => !x)) {
				config.filetmode = false;
				mod.command.message('C_PUT_WARE_ITEM not mapped, banker functions will be disabled!');
			}
			if (config.filetmode == 'sellscroll' && Object.values(extendedFunctions.seller).some(x => !x)) {
				config.filetmode = false;
				mod.command.message('C_STORE_SELL_ADD_BASKET|S_STORE_BASKET|C_STORE_COMMIT not mapped, seller functions will be disabled!');
			}
		} catch (e) {
			console.log(e);
		}
	});

	function hook(...args) {
		hooks.push(mod.hook(...args));
	}

	function toggleHooks() {
		enabled = !enabled;
		mod.clearAllTimeouts();
		if (enabled) {
			mod.command.message('Auto fishing activated. Manually start fishing now.');
			if(mod.majorPatchVersion >= 88){
				mod.command.message('Idk if current solution is safe.');
			}
		} else {
			mod.command.message('Auto fishing deactivated.');
		}
		if (enabled) {
			hook('S_FISHING_BITE', 1, sFishingBite);
			hook('S_START_FISHING_MINIGAME', 1, sStartFishingMinigame);
			hook('S_FISHING_CATCH', 1, sFishingCatch);
			hook('S_SYSTEM_MESSAGE', 1, sSystemMessage);
			hook('S_REQUEST_CONTRACT', 1, sRequestContract);
			hook('S_CANCEL_CONTRACT', 1, sCancelContract);
			hook('S_END_PRODUCE', 1, sEndProduce);
			hook('S_DIALOG', 2, sDialog);
			if (!Object.values(extendedFunctions.seller).some(x => !x)) {
				hook('S_STORE_BASKET', 'raw', sStoreBasket);
			}
			hook('S_RP_ADD_ITEM_TO_DECOMPOSITION_CONTRACT', 1, sRpAddItem);
			hook('S_SPAWN_NPC', 11, sSpawnNpc);
			hook('S_ABNORMALITY_BEGIN', mod.majorPatchVersion >= 86?4:3, sAbnBegin);
			if(mod.majorPatchVersion >= 88){
				hook('C_CAST_FISHING_ROD', 2, cCastFishingRod);
				hook('C_STOP_FISHING', 2, cStopFishing);
			}
			
			hook('S_TRADE_BROKER_DEAL_SUGGESTED', 1, sTradeBrokerDealSuggested);

		} else {
			for (var i = 0; i < hooks.length; i++) {
				mod.unhook(hooks[i]);
				delete hooks[i];
			}
		}
	}

	this.destructor = () => {
		mod.clearAllTimeouts();
	};

	//region Hooks

	// mod is turned on
	// not waiting for initial messages and settings
	// has auto negotiate
	// is not waiting on negotiations
	// and offered price is the same as seller price
	function sTradeBrokerDealSuggested(event) {
		console.log(`auto-fishing(${mod.game.me.name})| got S_TRADE_BROKER_DEAL_SUGGESTED, ${pendingDeals.length} current pending deals.`)

		if (hasNego && !negoWaiting && event.offeredPrice === event.sellerPrice)
		{
			// console.log('- checking if we have a nego already for this item');
			for(let i = 0; i < pendingDeals.length; i++)
            {
                let deal = pendingDeals[i];
                if(deal.playerId == event.playerId && deal.listing == event.listing)
                {
					// console.log('- found the same nego, so we are going to replace it');
                    pendingDeals.splice(i--, 1);
                }
            }
            // with any potential duplicates taken out, we add in the new deal
			pendingDeals.push(event);
			var dealLen = pendingDeals.length;
			mod.command.message("Nego deal was suggested. Addressing " + dealLen + (dealLen > 1 ? " deals" : " deal") + " before the next cast...")
            return false;
		}
	}

	function cCastFishingRod(event){
		event.counter=1;
		event.unk1=237;
		return true;
	}
	function cStopFishing(event){
		event.counter=1;
		event.unk=1;
		return true;
	}

	function sAbnBegin(event) {
		if (mod.game.me.is(event.target)) {
			switch (request.action) {
				case 'usesalad': {
					if (event.id == 70261)
						mod.setTimeout(() => {
							makeDecision();
						}, config.time.bait);
					break;
				}
				case 'usebait': {
					if (Object.keys(BAITS).includes(event.id.toString()))
						mod.setTimeout(() => {
							makeDecision();
						}, config.time.bait);
					break;
				}
			}
		}
	}

	function sSpawnNpc(event) {
		switch (request.action) {
			case "bank": {
				if (event.relation == 12 && event.templateId == TEMPLATE_BANKER && mod.game.me.is(event.owner)) {
					request.banker = event;
					mod.setTimeout(() => {
						contactToNpc(request.banker.gameId);
					}, rng(3000, 5000));
				}
				break;
			}
			case "sellscroll": {
				if (event.relation == 12 && TEMPLATE_SELLER.includes(event.templateId) && mod.game.me.is(event.owner)) {
					request.seller = event;
					mod.setTimeout(() => {
						contactToNpc(request.seller.gameId);
					}, rng(3000, 5000));
				}
				break;
			}
		}
	}

	function sRpAddItem() {
		if (request.action == 'dismantle') {
			if (request.fishes.length > 0) {
				mod.setTimeout(() => {
					dismantleFish();
				}, rng(config.time.dismantle));
			} else {
				mod.setTimeout(() => {
					commitDecomposition();
				}, 300);
			}
		}
	}

	function sFishingBite(event) {
		if (mod.game.me.is(event.gameId)) {
			mod.setTimeout(() => {
				mod.send('C_START_FISHING_MINIGAME', mod.majorPatchVersion>=88?2:1, {
					counter:1,
					unk:15
				});
			}, rng(config.time.stMinigame));
		}
	}

	function sStartFishingMinigame(event) {
		if (mod.game.me.is(event.gameId)) {
			lastLevel = event.level;
			if (config.skipbaf && (event.level == 11 || (abnormalityDuration(70261) > 0 && event.level == 7))) {
				mod.setTimeout(() => {
					mod.send('C_END_FISHING_MINIGAME', mod.majorPatchVersion>=88?2:1, {
						counter:1,
						unk:24,
						success: false
					});
					mod.setTimeout(() => {
						makeDecision();
					}, rng(config.time.rod));
				}, rng(8000, 10000));

			} else {
				mod.setTimeout(() => {
					mod.send('C_END_FISHING_MINIGAME', mod.majorPatchVersion>=88?2:1, {
						counter:1,
						unk:24,
						success: true
					});
				}, rng(config.time.minigame));
			}
		}
	}

	function sFishingCatch(event) {
		if (mod.game.me.is(event.gameId)) {
			endTime = moment();
			if (startTime != null && lastLevel != null)
				statistic.push({
					level: lastLevel,
					time: endTime.diff(startTime)
				});
			startTime = moment();
			mod.setTimeout(() => {
				makeDecision();
			}, rng(config.time.decision));
		}
	}

	function sSystemMessage(event) {
		let message = mod.parseSystemMessage(event.message);
		if (message.id == 'SMT_CANNOT_FISHING_NON_AREA') {
			mod.setTimeout(() => {
				makeDecision();
			}, rng(config.time.rod));
		}

		 // all out of deals and still waiting?
        // if we were waiting on deal negotites to finish (negoWaiting)
        // and ther are no more pending deals
        // and the system message is a mediate success sell
		else if (message.id == 'SMT_MEDIATE_SUCCESS_SELL') {
			var dealLen = pendingDeals.length;
			console.log(`auto-fishing(${mod.game.me.name})|NOTICE: cleared a deal, have ${dealLen} left`);
			if (DEBUG) {
				mod.command.message(`Cleared a deal, have ${dealLen} left`);
			}

			if (negoWaiting && !pendingDeals.length) {
				if (DEBUG) {
					mod.command.message('All negotiations finished... resuming fishing from original timeout');
				}
				// mod.setTimeout(() => {
				// 	makeDecision();
				// }, rng(config.time.decision) + 5000);
			}
		}

		// we want to throw the rod but still trading?
		else if (message.id == 'SMT_CANNOT_USE_ITEM_WHILE_CONTRACT') {
			negoWaiting = true;
			// console.log('Negotiations are taking long time to finish... lets wait a bit more + 10s delay')
			// mod.setTimeout(() => {
			// 	makeDecision();
			// }, rng(config.time.decision) + 10000);
		}
	}

	function sRequestContract(event) {
		switch (request.action) {
			case "sellscroll":
			case "selltonpc": {
				if (event.type == 9) {
					request.seller.contractId = event.id;
					if (request.fishes.length === 0) {
						mod.clearTimeout(endSellingTimer);
						endSellingTimer = mod.setTimeout(() => {
							cancelContract(9, request.seller.contractId);
						}, 5000);
					} else {
						mod.setTimeout(() => {
							sellFish();
						}, rng(config.time.sell));
					}
				}
				break;
			}
			case "bank": {
				if (event.type == 26) {
					request.banker.contractId = event.id;
					bankFillets();
				}
			}
			case "dismantle": {
				if (event.type == dismantle_contract_type) {
					request.contractId = event.id;
					dismantleFish();
				}
				break;
			}
		}
	}

	function sCancelContract(event) {
		switch (request.action) {
			case "sellscroll":
			case "selltonpc": {
				if (event.type == 9 && request.seller.contractId == event.id)
					mod.setTimeout(() => {
						makeDecision();
					}, rng(config.time.contract));
				break;
			}
			case "bank": {
				if (event.type == 26 && request.banker.contractId == event.id) {
					mod.setTimeout(() => {
						makeDecision();
					}, rng(config.time.contract));
				}
			}
			case "dismantle": {
				if (event.type == dismantle_contract_type && request.contractId == event.id) {
					mod.setTimeout(() => {
						makeDecision();
					}, rng(config.time.contract));
				}
				break;
			}
		}
	}

	function sEndProduce(event) {
		if (request.action == 'craft') {
			if (event.success) {
				mod.setTimeout(() => {
					makeDecision();
				}, rng(config.time.contract));
			}
		}
	}

	function sDialog(event) {
		switch (request.action) {
			case "bank": {
				if (event.gameId == request.banker.gameId) {
					request.banker.dialogId = event.id;
					mod.setTimeout(() => {
						mod.send('C_DIALOG', 1, {
							id: request.banker.dialogId,
							index: 1,
							questReward: -1,
							unk: -1
						});
					}, rng(config.time.dialog));
				}
				break;
			}
			case "sellscroll":
			case "selltonpc": {
				if (event.gameId == request.seller.gameId) {
					request.seller.dialogId = event.id;
					mod.setTimeout(() => {
						mod.send('C_DIALOG', 1, {
							id: request.seller.dialogId,
							index: 1,
							questReward: -1,
							unk: -1
						});
					}, rng(config.time.dialog));
				}
				break;
			}
		}
	}

	function sStoreBasket() {
		switch (request.action) {
			case "sellscroll":
			case "selltonpc": {
				if (request.fishes.length > 0 && sellItemsCount < 7) {
					sellItemsCount++;
					mod.setTimeout(() => {
						sellFish();
					}, rng(config.time.sell));
					if (request.fishes.length < 8) {
						mod.clearTimeout(endSellingTimer);
						endSellingTimer = mod.setTimeout(() => {
							cancelContract(9, request.seller.contractId);
						}, 10000);
					}
				} else {
					mod.setTimeout(() => {
						if (sellItemsCount > 0)
							sellFishes();
						else {
							mod.clearTimeout(endSellingTimer);
							endSellingTimer = mod.setTimeout(() => {
								cancelContract(9, request.seller.contractId);
							}, 1000);
						}
					}, 300);
				}
				break;
			}
		}
	}
	//endregion

	//region Permanent hooks
	mod.hook('C_START_PRODUCE', 1, event => {
		lastRecipe = event.recipe;
	});
	mod.hook('S_SPAWN_NPC', 11, event => {
		if (TEMPLATE_SELLER.includes(event.templateId) ||
			TEMPLATE_BANKER == event.templateId && event.owner === 0n ||
			mod.game.me.is(event.owner)) {
			npcList[event.gameId] = event;
		}
	});
	mod.hook('S_DESPAWN_NPC', 3, event => {
		delete npcList[event.gameId];
	});
	mod.hook('S_SPAWN_USER', 15, event => {
		if (event.gm && enabled)
			switch (config.gmmode) {
				case 'exit': {
					console.log(`auto-fishing(${mod.game.me.name})|ERROR: GM is near you, exit game xD`);
					toggleHooks();
					mod.toClient('S_EXIT', 3, {
						category: 0,
						code: 0
					});
					break;
				}
				case 'lobby': {
					console.log(`auto-fishing(${mod.game.me.name})|ERROR: GM is near you, return to lobby`);
					toggleHooks();
					mod.toServer('C_RETURN_TO_LOBBY', 1, {});
					break;
				}
				case 'stop': {
					mod.command.message(`ERROR: GM is near you, fishing stoped`);
					console.log(`auto-fishing(${mod.game.me.name})|ERROR: GM is near you, fishing stoped`);
					toggleHooks();
					break
				}
				default: {
					mod.command.message(`Warning: GM is near you.`);
					console.log(`auto-fishing(${mod.game.me.name})|Warning: GM is near you.`);
					break
				}
			}
	});

	mod.hook('S_PREMIUM_SLOT_DATALIST', 2, event => {
		for (let set of event.sets) {
			for (let inven of set.inventory) {
				if (ITEMS_BANKER.includes(inven.item)) {
					pcbangBanker = {
						set: set.id,
						slot: inven.slot,
						type: inven.type,
						id: inven.id
					};
				}
			}
		}
	});
	mod.hook('S_START_COOLTIME_ITEM', 1, event => {
		if ((ITEMS_BANKER.includes(event.item) || ITEMS_SELLER.includes(event.item)) && event.cooldown > 0 && !scrollsInCooldown) {
			scrollsInCooldown = true;
			setTimeout(() => {
				scrollsInCooldown = false;
			}, event.cooldown * 1000);
		}
	});
	mod.hook('C_PLAYER_LOCATION', 5, event => {
		playerLocation = event;
	});
	mod.hook('S_LOAD_TOPO', 3, event => {
		playerLocation.loc = event.loc;
		playerLocation.w = 0;
		if (enabled)
			mod.clearAllTimeouts();
	});
	mod.hook('C_RETURN_TO_LOBBY', 1, event => {
		if (enabled)
			mod.clearAllTimeouts();
	});
	mod.hook('S_EXIT', 3, event => {
		if (enabled)
			mod.clearAllTimeouts();
	});
	//endregion

	//region Abnormality tracking
	let abnormalities = {};
	mod.hook('S_ABNORMALITY_BEGIN', mod.majorPatchVersion >= 86?4:3, event => {
		if (mod.game.me.is(event.target))
			abnormalities[event.id] = Date.now() + Number.parseInt(event.duration);;
	});

	mod.hook('S_ABNORMALITY_REFRESH', mod.majorPatchVersion >= 86?2:1, event => {
		if (mod.game.me.is(event.target))
			abnormalities[event.id] = Date.now() + Number.parseInt(event.duration);;
	});

	mod.hook('S_ABNORMALITY_END', 1, event => {
		if (mod.game.me.is(event.target))
			delete abnormalities[event.id];
	});

	function abnormalityDuration(id) {
		if (!abnormalities[id])
			return 0;
		return abnormalities[id] - Date.now();
	}
	//endregion

	//region Decision
	function makeDecision() {
		mod.clearTimeout(idleCheckTimer);
		idleCheckTimer = mod.setTimeout(() => {
			makeDecision();
		}, 300 * 1000);
		let action = "userod";
		request = {};
		let filets = mod.game.inventory.findInBagOrPockets(FILET_ID);
		let fishes = mod.game.inventory.findAllInBagOrPockets(flatSingle(ITEMS_FISHES)).filter(f => !config.blacklist.includes(f.id));
		// blacklist override option if there's no fish available
		if (config.overrideBlacklist) {
			if (fishes.length == 0) {
				fishes = mod.game.inventory.findAllInBagOrPockets(flatSingle(ITEMS_FISHES));
				fishes = fishes.slice(Math.max(fishes.length - 5, 0));
				console.log(`auto-fishing(${mod.game.me.name})|NOTICE: Used blacklist override to get ${fishes.length} inventory slots.`)
				if (DEBUG) {
					mod.command.message(`Used blacklist override to get ${fishes.length} inventory slots`);
				}
			}
		}
		let bait = mod.game.inventory.findInBagOrPockets(Object.values(BAITS));
		let salad = mod.game.inventory.findInBagOrPockets(ITEMS_SALAD);
		if (config.autosalad) {
			if (abnormalityDuration(70261) <= 0 && salad !== undefined)
				action = "usesalad";
		}
		if (bait === undefined) {
			if (filets === undefined || filets.amount < 60) {
				action = "dismantle";
			} else {
				action = "craft";
			}
		} else {
			if (Object.keys(BAITS).every((el) => {
					return abnormalityDuration(Number(el)) <= 0;
				}))
				action = "usebait";
		}
		if (mod.game.inventory.bag.size - mod.game.inventory.bagItems.length <= 3) {
			if (filets === undefined || filets.amount < 60)
				action = "dismantle";
			else
				action = "fullinven";

		}
		if (filets !== undefined && filets.amount >= 9000 &&
			config.filetmode != 'sellscroll' &&
			config.filetmode != 'selltonpc') {
			action = "toomanyfilets"
		}
		//check
		switch (action) {
			case "fullinven": {
				action = config.filetmode;
				switch (config.filetmode) {
					case 'sellscroll': {
						if (scrollsInCooldown) {
							console.log("Scroll in cooldown retry in 1 min");
							mod.setTimeout(() => {
								makeDecision();
							}, 60 * 1000);
							action = 'wait';
						} else {
							let scroll = mod.game.inventory.findInBagOrPockets(ITEMS_SELLER);
							if (scroll === undefined) {
								mod.command.message(`ERROR: Cant find any seller scroll`);
								console.log(`auto-fishing(${mod.game.me.name})|ERROR: Cant find any seller scroll`);
								action = 'aborted';
							} else {
								request = {
									scroll: scroll,
									fishes: fishes
								};
							}
						}
						break;
					}
					case 'selltonpc': {
						let npc = findClosestNpc();
						if (npc === undefined || npc.distance === undefined || npc.distance > config.contdist * 25) {
							mod.command.message('ERROR: No seller npc found at the acceptable range.');
							console.log(`auto-fishing(${mod.game.me.name})|ERROR: No seller npc found at the acceptable range.`);
							action = 'aborted';
						} else {
							request = {
								seller: npc,
								fishes: fishes
							};
						}
						break;
					}
					default: {
						if (fishes.length === 0) {
							mod.command.message(`ERROR: Can't find any fishes for dismantle`);
							console.log(`auto-fishing(${mod.game.me.name})|ERROR: Can't find any fishes for dismantle`);
							action = 'aborted';
						} else {
							action = 'dismantle';
							request = {
								fishes: fishes.slice(0, 20)
							}
						}
						break;
					}
				}
				break;
			}
			case "toomanyfilets": {
				switch (config.filetmode) {
					case 'bank': {
						action = 'bank';
						if (scrollsInCooldown) {
							console.log("Scroll in cooldown retry in 1 min");
							mod.setTimeout(() => {
								makeDecision();
							}, 60 * 1000);
							action = 'wait';
						} else {
							if (pcbangBanker == null) {
								let scroll = mod.game.inventory.findInBagOrPockets(ITEMS_BANKER);
								if (scroll === undefined) {
									mod.command.message(`ERROR: Cant find any banker scroll`);
									console.log(`auto-fishing(${mod.game.me.name})|ERROR: Cant find any banker scroll`);
									action = 'aborted';
								} else {
									request = {
										scroll: scroll,
										filets: filets
									};
								}
							} else {
								request = {
									slot: pcbangBanker,
									filets: filets
								};
							}
						}
						break;
					}
					default: {
						mod.command.message(`ERROR: No action for toomanyfilets`);
						action = 'aborted';
						break;
					}
				}
				break;
			}
			case "userod": {
				if (pendingDeals.length) {
					if (DEBUG) {
						mod.command.message("going to check on deals instead of casting rod now");
					}
					console.log(`auto-fishing(${mod.game.me.name}|NOTICE: have ${pendingDeals.length} deals, going to negotiate`);
					action = 'negotiate';
					break;
				}

				negoWaiting = false;
				let rod = mod.game.inventory.findInBagOrPockets(flatSingle(ITEMS_RODS));
				request = {
					rod: rod
				};
				break;
			}
			case "usesalad": {
				request = {
					salad: salad
				}
				break;
			}
			case "usebait": {
				request = {
					bait: bait
				}
				break;
			}
			case "dismantle": {
				if (fishes.length === 0) {
					mod.command.message(`ERROR: Can't find any fishes for dismantle`);
					console.log(`auto-fishing(${mod.game.me.name})|ERROR: Can't find any fishes for dismantle`);
					action = 'aborted';
				} else {
					request = {
						fishes: fishes.slice(0, 20)
					}
				}
				break;
			}
			case "craft": {
				if (config.recipe === undefined) {
					mod.command.message(`ERROR: No crafting recipe found `);
					console.log(`auto-fishing(${mod.game.me.name})|ERROR: No crafting recipe found`);
					action = 'aborted';
				} else {
					request = {
						recipe: config.recipe
					}
				}

			}
		}
		if (DEBUG)
			mod.command.message(`Decision ${action}`);
		request.action = action;
		processDecision();
	}

	function processDecision() {
		switch (request.action) {
			case "dismantle": {
				mod.setTimeout(() => {
					requestContract(dismantle_contract_type);
				}, rng(config.time.contract));
				break;
			}
			case "usebait": {
				mod.setTimeout(() => {
					useItem(request.bait);
				}, rng(config.time.bait));
				break;
			}
			case "userod": {
				mod.setTimeout(() => {
					useItem(request.rod);
				}, rng(config.time.rod));
				break;
			}
			case "usesalad": {
				mod.setTimeout(() => {
					useItem(request.salad);
				}, rng(config.time.bait));
				break;
			}
			case "bank": {
				mod.setTimeout(() => {
					if (request.slot !== undefined)
						useSlot(request.slot);
					else
						useItem(request.scroll);
				}, rng(config.time.rod));
				break;
			}
			case "selltonpc": {
				mod.setTimeout(() => {
					contactToNpc(request.seller.gameId);
				}, rng(config.time.rod));
				break;
			}
			case "sellscroll": {
				mod.setTimeout(() => {
					useItem(request.scroll);
				}, rng(config.time.rod));
				break;
			}
			case "craft": {
				mod.setTimeout(() => {
					startCraft();
				}, rng(config.time.contract));
				break;
			}
			case "aborted": {
				toggleHooks();
				break;
			}
			case "negotiate": {
				mod.command.message("Lets address suggested deals and give it 30s...");
        		//console.log("nego start wait");
        
				for(let i = 0; i < pendingDeals.length; i++)
				{
					mod.toClient('S_TRADE_BROKER_DEAL_SUGGESTED', 1, pendingDeals[i]);
					pendingDeals.splice(i--, 1);
				}
				negoWaiting = true;
				mod.setTimeout(() => {
					makeDecision();
				}, rng(config.time.decision) + 30000);
			}
		}
	}
	//endregion

	//region Send
	function bankFillets() {
		let amount = (config.bankAmount > request.filets.amount ? request.filets.amount : config.bankAmount) - 150;
		if (mod.majorPatchVersion >= 85) {
			mod.send('C_PUT_WARE_ITEM', 3, {
				gameId: mod.game.me.gameId,
				type: 1,
				page: 0,
				pocket: request.filets.pocket,
				invenPos: request.filets.slot,
				id: request.filets.id,
				dbid: request.filets.dbid,
				amount: amount
			});
		} else {
			mod.send('C_PUT_WARE_ITEM', 2, {
				gameId: mod.game.me.gameId,
				type: 1,
				page: 0,
				invenPos: request.filets.slot + 40,
				dbid: request.filets.id,
				uid: request.filets.dbid,
				amont: amount
			});
		}

		mod.setTimeout(() => {
			cancelContract(26, request.banker.contractId);
		}, 5000);
	}

	function sellFishes() {
		sellItemsCount = 0;
		mod.send('C_STORE_COMMIT', 1, {
			gameId: mod.game.me.gameId,
			contract: request.seller.contractId
		});
	}

	function useItem(item) {
		mod.send('C_USE_ITEM', 3, {
			gameId: mod.game.me.gameId,
			id: item.id,
			dbid: item.dbid,
			amount: 1,
			loc: playerLocation.loc,
			w: playerLocation.w,
			unk4: true
		});
	}


	function useSlot(slot) {
		mod.send('C_USE_PREMIUM_SLOT', 1, slot);
	}

	function contactToNpc(gameId) {
		mod.send('C_NPC_CONTACT', 2, {
			gameId: gameId
		});
	}

	function sellFish() {
		let fish = request.fishes.shift();
		if (fish != undefined) {
			if (mod.majorPatchVersion >= 85) {
				mod.send('C_STORE_SELL_ADD_BASKET', 2, {
					cid: mod.game.me.gameId,
					npc: request.seller.contractId,
					item: fish.id,
					quantity: 1,
					pocket: fish.pocket,
					slot: fish.slot
				});
			} else {
				mod.send('C_STORE_SELL_ADD_BASKET', 1, {
					cid: mod.game.me.gameId,
					npc: request.seller.contractId,
					item: fish.id,
					quantity: 1,
					slot: fish.slot + 40
				});
			}
		} else {
			mod.clearTimeout(endSellingTimer);
			endSellingTimer = mod.setTimeout(() => {
				cancelContract(9, request.seller.contractId);
			}, 1000);
		}
	}

	function dismantleFish() {
		let fish = request.fishes.shift();
		if (fish != undefined)
			mod.send('C_RQ_ADD_ITEM_TO_DECOMPOSITION_CONTRACT', 1, {
				contract: request.contractId,
				dbid: fish.dbid,
				itemid: fish.id,
				amount: 1
			});
	}

	function commitDecomposition() {
		mod.send('C_RQ_COMMIT_DECOMPOSITION_CONTRACT', 1, {
			contract: request.contractId
		});
		mod.setTimeout(() => { //reduce opcodes
			cancelContract(dismantle_contract_type, request.contractId);
		}, 10000);
	}

	function requestContract(type, obj) {
		let contract = {
			type: type
		};
		mod.send('C_REQUEST_CONTRACT', 1, contract);
	}

	function cancelContract(type, id) {
		mod.send('C_CANCEL_CONTRACT', 1, {
			type: type,
			id: id
		});
	}

	function startCraft() {
		mod.send('C_START_PRODUCE', 1, {
			recipe: request.recipe
		});
	}
	//endregion

	//region Helper
	function getItemIdChatLink(chatLink) {
		let regexId = /#(\d*)@/;
		let id = chatLink.match(regexId);
		if (id) return parseInt(id[1])
		else return null;
	}

	function findClosestNpc() {
		let npc = Object.values(npcList).filter(x => TEMPLATE_SELLER.includes(x.templateId));
		for (let i = npc.length; i-- > 0; npc[i].distance = npc[i].loc.dist3D(playerLocation.loc));
		npc = npc.reduce((result, obj) => {
			return (!(obj.distance > result.distance)) ? obj : result;
		}, {});
		return npc;
	}

	function getConfigData(pathToFile) {
		try {
			config = JSON.parse(fs.readFileSync(path.join(__dirname, pathToFile)));
		} catch (e) {
			config = {};
		}
		checkConfig();
	}

	function checkConfig() {
		if (config.time === undefined)
			config.time = {};
		if (config.time.minigame === undefined) {
			config.time.minigame = {};
			config.time.minigame.min = 4000;
			config.time.minigame.max = 5000;
		}
		if (config.time.stMinigame === undefined) {
			config.time.stMinigame = {};
			config.time.stMinigame.min = 2000;
			config.time.stMinigame.max = 4000;
		}
		if (config.time.rod === undefined) {
			config.time.rod = {};
			config.time.rod.min = 4500;
			config.time.rod.max = 5500;
		}
		if (config.time.bait === undefined) {
			config.time.bait = {};
			config.time.bait.min = 250;
			config.time.bait.max = 750;
		}
		if (config.time.sell === undefined) {
			config.time.sell = {};
			config.time.sell.min = 150;
			config.time.sell.max = 300;
		}
		if (config.time.contract === undefined) {
			config.time.contract = {};
			config.time.contract.min = 500;
			config.time.contract.max = 1000;
		}
		if (config.time.dialog === undefined) {
			config.time.dialog = {};
			config.time.dialog.min = 1500;
			config.time.dialog.max = 3000;
		}
		if (config.time.dismantle === undefined) {
			config.time.dismantle = {};
			config.time.dismantle.min = 200;
			config.time.dismantle.max = 400;
		}
		if (config.time.decision === undefined) {
			config.time.decision = {};
			config.time.decision.min = 500;
			config.time.decision.max = 700;
		}
		if (config.bankAmount <= 0)
			config.bankAmount = 8000;
		if (config.contdist < 0)
			config.contdist = 6;
		if (config.blacklist === undefined)
			config.blacklist = ITEMS_FISHES_BAFS;
		if (config.gmmode === undefined)
			config.gmmode = 'stop';
		if (config.overrideBlacklist == undefined)
			config.overrideBlacklist = false;
	}

	function rng(f, s) {
		if (s !== undefined)
			return f + Math.floor(Math.random() * (s - f + 1));
		else
			return f.min + Math.floor(Math.random() * (f.max - f.min + 1));
	}

	function saveConfig(pathToFile, data) {
		fs.writeFile(path.join(__dirname, pathToFile), JSON.stringify(data, null, '\t'), err => {});
	}

	function* range(a, b) {
		for (var i = a; i <= b; ++i) yield i;
	}
	//endregion

	function blacklistAddFrom(srcList) {
		// for element in list, if not in blacklist, add to blacklist
		for (const fishId of srcList) {
			blacklistAdd(fishId);
		}
	}

	function blacklistRemoveFrom(srcList) {
		// for element in list, if in blacklist, remove from blacklist
		for (const fishId of srcList) {
			blacklistRemove(fishId);
		}
	}

	function blacklistAdd(itemId) {
		if (config.blacklist.indexOf(itemId) == -1) {
			mod.command.message(`Pushed item id to blacklist: ${itemId}`);
			config.blacklist.push(itemId);
		} else {
			mod.command.message(`Already exist`);
		}
	}

	function blacklistRemove(itemId) {
		var index = config.blacklist.indexOf(itemId);
		if (index == -1) {
			mod.command.message(`not exist`);
		} else {
			mod.command.message(`Remove item id from blacklist: ${itemId}`);
			config.blacklist.splice(index, 1);
		}
	}

	function getFishTier(fishId) {
		if (ITEMS_FISHES_T0S.indexOf(fishId) != -1) {
			return 0;
		}
		else if (ITEMS_FISHES_T1S.indexOf(fishId) != -1) {
			return 1;
		}
		else if (ITEMS_FISHES_T2S.indexOf(fishId) != -1) {
			return 2;
		}
		else if (ITEMS_FISHES_T3S.indexOf(fishId) != -1) {
			return 3;
		}
		else if (ITEMS_FISHES_T4S.indexOf(fishId) != -1) {
			return 4;
		}
		else if (ITEMS_FISHES_T5S.indexOf(fishId) != -1) {
			return 5;
		}
		else if (ITEMS_FISHES_T6S.indexOf(fishId) != -1) {
			return 6;
		}
		else if (ITEMS_FISHES_T7S.indexOf(fishId) != -1) {
			return 7;
		}
		else if (ITEMS_FISHES_T8S.indexOf(fishId) != -1) {
			return 8;
		}
		else if (ITEMS_FISHES_T9S.indexOf(fishId) != -1) {
			return 9;
		}
		else if (ITEMS_FISHES_T10S.indexOf(fishId) != -1) {
			return 10;
		}
		else {
			return 11;
		}
	}

	function blacklistShow() {
		for (const fishId of config.blacklist) {
			var tier = getFishTier(fishId);
			mod.command.message(`${fishId}, T${tier}`);
		}
		mod.command.message('Blacklist override is ' + (config.overrideBlacklist ? 'on.' : 'off.'));
	}

	function showSettings() {
		mod.command.message(`Current settings:`);

		// filetmode prints
		switch (config.filetmode) {
			case 'bank':
				mod.command.message(`filet mode: Set to bank ${config.bankAmount} filets after filling inventory`);
				break;
			case 'selltonpc':
				mod.command.message(`filet mode: Sell to npc within ${config.contdist}m instead using scrolls enabled.`);
				break;
			case 'sellscroll':
				mod.command.message(`filet mode: Sell to npc with npc scrolls.`);
				break;
			default:
				mod.command.message(`filet mode: disabled`);
				break;
		}

		// recipe
		if (config.recipe != null) {
			mod.command.message(`Crafting: Recipe id set to: ${config.recipe}`);
		}
		else {
			mod.command.message(`Crafting: Recipe id not set`);
		}

		// fish salad state
		mod.command.message('Auto use of fish salad is ' + (config.autosalad ? 'en' : 'dis') + 'abled.');

		// gm detection action
		mod.command.message(`Gm detected mode set to ${config.gmmode}`);
		if (config.gmmode) {
			switch (config.gmmode) {
				case 'exit':
					mod.command.message(`if Gm spawns nearby, will exit game`);
					break;
				case 'lobby':
					mod.command.message(`if Gm spawns nearby, will exit to lobby`);
					break;
				case 'stop':
					mod.command.message(`if Gm spawns nearby, will stay in game but stop fishing`);
					break;
			}
		}

		// skip baf mode
		mod.command.message('Skip BAF mode is ' + (config.skipbaf ? 'en' : 'dis') + 'abled.');

		// blacklist notes (use blacklist show for detailed list)
		mod.command.message(`Blacklist has ${config.blacklist.length} items and override is ` + (config.overrideBlacklist ? 'on' : 'off'));

		// debug mode
		mod.command.message('Debug mode is ' + (DEBUG ? 'en' : 'dis') + 'abled.');
	}

	//region Command
	mod.command.add('fish', (key, arg, arg2) => {
		switch (key) {
			case 'blacklist':
				switch (arg) {
					case 'add':
						var tmp = getItemIdChatLink(arg2);
						if (tmp != null) {
							blacklistAdd(tmp);
						} else {
							switch (arg2) {
								case 'T0':
									// add T0's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T0S);
									break;
								case 'T1':
									// add T1's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T1S);
									break;
								case 'T2':
									// add T2's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T2S);
									break;
								case 'T3':
									// add T3's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T3S);
									break;
								case 'T4':
									// add T4's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T4S);
									break;
								case 'T5':
									// add T5's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T5S);
									break;
								case 'T6':
									// add T6's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T6S);
									break;
								case 'T7':
									// add T7's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T7S);
									break;
								case 'T8':
									// add T8's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T8S);
									break;
								case 'T9':
									// add T9's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T9S);
									break;
								case 'T10':
									// add T10's to blacklist
									blacklistAddFrom(ITEMS_FISHES_T10S);
									break;
								case 'T11':
								case 'BAF':
									// add T11's to blacklist
									blacklistAddFrom(ITEMS_FISHES_BAFS);
									break;
								default:
									mod.command.message(`Incorrect item id`);
									break;
							}
						}
						break;
					case 'remove':
						var tmp = getItemIdChatLink(arg2);
						if (tmp != null) {
							blacklistRemove(tmp);
						} else {
							switch (arg2) {
								case 'T0':
									// add T0's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T0S);
									break;
								case 'T1':
									// add T1's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T1S);
									break;
								case 'T2':
									// add T2's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T2S);
									break;
								case 'T3':
									// add T3's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T3S);
									break;
								case 'T4':
									// add T4's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T4S);
									break;
								case 'T5':
									// add T5's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T5S);
									break;
								case 'T6':
									// add T6's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T6S);
									break;
								case 'T7':
									// add T7's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T7S);
									break;
								case 'T8':
									// add T8's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T8S);
									break;
								case 'T9':
									// add T9's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T9S);
									break;
								case 'T10':
									// add T10's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_T10S);
									break;
								case 'T11':
								case 'BAF':
									// add T11's to blacklist
									blacklistRemoveFrom(ITEMS_FISHES_BAFS);
									break;
								default:
									mod.command.message(`Incorrect item id`);
									break;
							}
						}
						break;
					case 'show':
						blacklistShow();
						break;
					case 'reset':
						config.blacklist = [];
						mod.command.message(`Blacklist reset`);
						break;
					case 'override':
						config.overrideBlacklist = !config.overrideBlacklist;
						mod.command.message('Blacklist override has been ' + (config.overrideBlacklist ? 'en' : 'dis') + 'abled.');
						break;
				}
				break;
			case 'filetmode':
				switch (arg) {
					case 'bank':
						var amount = parseInt(arg2);
						if (amount > 500 && amount < 10000) {
							config.bankAmount = amount;
							mod.command.message(`Set to bank ${config.bankAmount} files after filling inventory`);
						} else {
							config.bankAmount = 8000;
							mod.command.message(`Set to bank ${config.bankAmount} files after filling inventory`);
						}
						config.filetmode = 'bank';
						if (config.filetmode == 'bank' && Object.values(extendedFunctions.banker).some(x => !x)) {
							config.filetmode = false;
							mod.command.message('C_PUT_WARE_ITEM is not mapped, banker functions for auto-fishing will be disabled now.');
						}
						break;
					default:
						mod.command.message(`filetmode disabled`);
						config.filetmode = false;
						break;
				}
				break;
			case 'setrecipe':
				if (lastRecipe != null) {
					mod.command.message(`Recipe id set to: ${lastRecipe}`);
					config.recipe = lastRecipe;
				} else {
					mod.command.message(`Incorrect item id. Manually craft bait when mod enabled`);
				}
				break;
			case 'sellscroll':
				mod.command.message(`Set to sell fishes after filling inventory`);
				config.filetmode = 'sellscroll';
				if (config.filetmode == 'sellscroll' && Object.values(extendedFunctions.seller).some(x => !x)) {
					config.filetmode = false;
					mod.command.message('C_STORE_SELL_ADD_BASKET|S_STORE_BASKET|C_STORE_COMMIT not mapped, seller functions will be disabled!');
				}
				break;
			case 'selltonpc':
				config.filetmode = 'selltonpc';
				mod.command.message(`Sell to npc instead using scrolls enabled.`);
				var dist = parseInt(arg);
				if (dist > 0) {
					if (dist > 8)
						dist = 6;
					config.contdist = dist;
					mod.command.message(`Distance for NPC contact set to: ${dist}m`);
				}
				let npc = findClosestNpc();
				if (npc === undefined || npc.distance === undefined || npc.distance > config.contdist * 25) {
					mod.command.message('Warning: no seller npc at acceptable range');
				}
				break;
			case 'autosalad':
				config.autosalad = !config.autosalad;
				mod.command.message('Auto use of fish salad is now ' + (config.autosalad ? 'en' : 'dis') + 'abled.');
				break;
			case 'gmmode':
				config.gmmode = arg;
				mod.command.message(`Gm detected mode has been set to ${config.gmmode}`);
				break;
			case 'skipbaf':
				config.skipbaf = !config.skipbaf;
				mod.command.message('Skip BAF mode has been ' + (config.skipbaf ? 'en' : 'dis') + 'abled.');
				break;
			case 'save':
				mod.command.message('Configuration has been saved.');
				saveConfig(settingsPath, config);
				break;
			case 'settings':
				showSettings();
				break;
			case 'reloadconf':
				getConfigData(settingsPath);
				mod.command.message('Configuration has been reloaded.');
				break;
			case 'debug':
				DEBUG = !DEBUG;
				mod.command.message('Debug mode has been ' + (DEBUG ? 'en' : 'dis') + 'abled.');
				break;
			case 'stats':
				var gr = statistic.reduce((acc, val) => {
					(acc[val['level']] = acc[val['level']] || []).push(val);
					return acc;
				}, {});
				mod.command.message(`Printing stats.`);
				for (var lv in gr) {
					mod.command.message(`${lv} level:${gr[lv].length}`);
				}
				var timePerFish = statistic.reduce((prev, next) => prev + next.time, 0) / statistic.length;
				mod.command.message(`Total fishes: ${statistic.length}`);
				mod.command.message(`Time per fish: ${(timePerFish/1000).toFixed(2)}s`);
				break;
			default:
				if (key !== undefined) {
					mod.command.message('Incorrect command');
				} else {
					hasNego = mod.manager.isLoaded('auto-nego');
					if (config.filetmode == 'selltonpc') {
						let npc = findClosestNpc();
						if (npc === undefined || npc.distance === undefined || npc.distance > config.contdist * 25) {
							mod.command.message('Warning: no seller npc at acceptable range');
						}
					}
					toggleHooks();
					if (enabled) {
						showSettings();
						statistic = [], startTime = null, endTime = null, lastLevel = null;
					}
				}
				break;
		}
	});
	//endregion
};