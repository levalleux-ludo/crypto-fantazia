import { dbEvents } from "./db/db";
import { Space, dropSpaces, ISpace, eSpaceType, eStartupType } from "./db/space.model";
import { GameConfig } from "./game.service";
import startups from './startups.json';
import playground from './playground.json';
import { start } from "repl";

class SpaceService {
    constructor() {
        dbEvents.on('connected', () => {
            dropSpaces().then(async () => {
                let spaceId = 0;
                const startupsDetails = new Map();
                startupsDetails.set(eStartupType.BAKERY, []);
                startupsDetails.set(eStartupType.MINING_FARM, []);
                startupsDetails.set(eStartupType.MARKETPLACE, []);
                startupsDetails.set(eStartupType.EXCHANGE, []);
                startupsDetails.set('default', []);
                for (let startup of startups.startups) {
                    switch (startup.subtype) {
                        case eStartupType.BAKERY:
                        case eStartupType.MINING_FARM:
                        case eStartupType.MARKETPLACE:
                        case eStartupType.EXCHANGE: {
                            startupsDetails.get(startup.subtype).push(startup);
                            break;
                        }
                        default: {
                            startupsDetails.get('default').push(startup);
                            break;
                        }
                    }
                }
                let images = new Map();
                for (let image of playground.images) {
                    images.set(image.type, image.image);
                }
                for (let space of playground.spaces) {
                    const spaceParams: any = {};
                    spaceParams.spaceId = spaceId++;
                    console.log('Create space of type', space.type);
                    spaceParams.type = space.type;
                    switch (spaceParams.type) {
                        case eSpaceType.GENESIS: {
                            spaceParams.title = 'Genesis Block';
                            spaceParams.detail = 'Each time you land or pass this block, you earn \U+8497 200';
                            spaceParams.image = images.get(spaceParams.type);
                            break;
                        }
                        case eSpaceType.COVID: {
                            spaceParams.title = 'COVID Infection';
                            spaceParams.detail = "You've caught COVID-19. Go to quarantine and you miss you next turn.";
                            spaceParams.image = images.get(spaceParams.type);
                            break;
                        }
                        case eSpaceType.QUARANTINE: {
                            spaceParams.title = 'Quarantine Area';
                            spaceParams.detail = 'When in Quarantine, you miss your next turn';
                            spaceParams.image = images.get(spaceParams.type);
                            break;
                        }
                        case eSpaceType.CHANCE: {
                            spaceParams.title = 'Chance';
                            spaceParams.detail = 'When you land on this space, randomly take a Chance Card, and performs the instructions';
                            spaceParams.image = images.get(spaceParams.type);
                            break;
                        }
                        case eSpaceType.COMMUNITY: {
                            spaceParams.title = 'Community Chest';
                            spaceParams.detail = 'When you land on this space, randomly take a Community Chest Card, and performs the instructions';
                            spaceParams.image = images.get(spaceParams.type);
                            break;
                        }
                        case eSpaceType.BAKERY:
                        case eSpaceType.MINING_FARM:
                        case eSpaceType.MARKETPLACE:
                        case eSpaceType.EXCHANGE: {
                            const details = startupsDetails.get(spaceParams.type);
                            if (details.length === 0) {
                                throw new Error(`Unable to assign space of type ${spaceParams.type} at position ${spaceId} because no more asset of this type left`);
                            }
                            const detail = details.pop();
                            spaceParams.title = detail.name;
                            spaceParams.subtype = detail.subtype;
                            spaceParams.family = detail.family;
                            spaceParams.detail = detail.detail;
                            spaceParams.price = detail.price;
                            spaceParams.image = detail.image;
                            break;
                        }
                        default: { // Assets
                            const details = startupsDetails.get('default');
                            if (details.length === 0) {
                                throw new Error(`Unable to assign space of type Startup at position ${spaceId} because no more asset of this type left`);
                            }
                            const detail = details.pop();
                            spaceParams.title = detail.name;
                            spaceParams.subtype = detail.subtype;
                            spaceParams.family = detail.family;
                            spaceParams.detail = detail.detail;
                            spaceParams.price = detail.price;
                            spaceParams.image = detail.image;
                            spaceParams.featureCost = detail.featureCost;
                            spaceParams.rentRates = detail.rentRates;
                            break;
                        }
                    }
                    const s = new Space(spaceParams);
                    await s.save();
                }
            }).catch((err) => console.error(err));
        });
    }

    async getAll(): Promise<ISpace[]> {
        return await Space.find();
    }

    async getBySpaceId(id: number): Promise<ISpace | null> {
        return await Space.findOne({spaceId: id});
    }

}

export const spaceService = new SpaceService();