import * as THREE from 'three';
import { ED3DMap } from './ED3DMap';
import { System } from './System';

export class HUD {
    private hoverText!: THREE.Mesh;
    private activeSystem: System | null = null;
    private hudElement: HTMLDivElement | null = null;
    private titleElement: HTMLHeadElement | null = null;
    private systemCoordsXElement: HTMLSpanElement | null = null;
    private systemCoordsYElement: HTMLSpanElement | null = null;
    private systemCoordsZElement: HTMLSpanElement | null = null;
    private systemInformationElement: HTMLParagraphElement | null = null;
    private filterContainerElement: HTMLDivElement | null = null;
    private searchContainerElement: HTMLDivElement | null = null;
    private searchInputElement: HTMLInputElement | null = null;
    private navigationContainerElement: HTMLDivElement | null = null;

    public constructor(
        private readonly ED3DMap: ED3DMap) {

        if (this.ED3DMap.config.withOptionsPanel) {
            const controlsContainer = document.createElement("div");
            this.ED3DMap.appendToContainer(controlsContainer);
            controlsContainer.classList.add("controls");

            /*
            {
                const link1 = document.createElement("a");
                controlsContainer.append(link1);
                link1.innerText = "3D";
                link1.classList.add("selected");
                link1.onclick = () => {
                    console.log("link1");
                };
            }
            {
                const link2 = document.createElement("a");
                controlsContainer.append(link2);
                link2.innerText = "2D";
                link2.onclick = () => {
                    console.log("link2");
                };
            }
            */
            {
                const link3 = document.createElement("a");
                controlsContainer.append(link3);
                link3.innerText = "i";
                if (this.ED3DMap.config.showGalaxyInfos) {
                    link3.classList.add("selected");
                }
                link3.onclick = () => {
                    console.log("link3");
                };
            }
            {
                const link4 = document.createElement("a");
                controlsContainer.append(link4);
                link4.innerText = "X"; // Ico.cog
                link4.onclick = () => {
                    console.log("link4");
                };
            }
            // <div id="options" style="display:none;"></div>' +
            // this.createSubOptions();

            // Optionnal button to go fullscreen
            /*
            if (Ed3d.withFullscreenToggle) {
                $("<a></a>")
                    .attr("id", "tog-fullscreen")
                    .html('Fullscreen')
                    .click(function () {
                        $('#' + container).toggleClass('map-fullscreen');
                        refresh3dMapSize();
                    })
                    .prependTo("#controls");
            }
            */
        }

        if (this.ED3DMap.config.withHudPanel) {
            this.hudElement = document.createElement("div");
            this.ED3DMap.appendToContainer(this.hudElement);
            this.hudElement.classList.add("hud");

            this.hudElement.onpointerenter = () => {
                this.ED3DMap.disableControls();
            };

            this.hudElement.onpointerleave = () => {
                this.ED3DMap.enableControls();
            };

            this.titleElement = document.createElement("h2");
            this.hudElement.append(this.titleElement);
            this.titleElement.innerText = "Infos";

            const distToSolContainer = document.createElement("div");
            this.hudElement.append(distToSolContainer);

            distToSolContainer.append(document.createTextNode("Dist. Sol "));

            const distTolSolElement = document.createElement("span");
            distToSolContainer.append(distTolSolElement);
            distTolSolElement.innerText = "-";

            const coordinatesContainer = document.createElement("div");
            this.hudElement.append(coordinatesContainer);
            coordinatesContainer.classList.add("coords");

            this.systemCoordsXElement = document.createElement("span");
            coordinatesContainer.append(this.systemCoordsXElement);
            this.systemCoordsXElement.innerText = "0";

            this.systemCoordsYElement = document.createElement("span");
            coordinatesContainer.append(this.systemCoordsYElement);
            this.systemCoordsYElement.innerText = "0";

            this.systemCoordsZElement = document.createElement("span");
            coordinatesContainer.append(this.systemCoordsZElement);
            this.systemCoordsZElement.innerText = "0";

            this.systemInformationElement = document.createElement("p");
            this.hudElement.append(this.systemInformationElement);

            if (this.ED3DMap.config.showSystemSearch) {
                this.searchContainerElement = document.createElement("div");
                this.hudElement.append(this.searchContainerElement);

                const searchTitle = document.createElement("h2");
                this.searchContainerElement.append(searchTitle);
                searchTitle.innerText = "Search";

                this.searchInputElement = document.createElement("input");
                this.searchContainerElement.append(this.searchInputElement);
                this.searchInputElement.type = "text";
            }

            this.filterContainerElement = document.createElement("div");
            this.hudElement.append(this.filterContainerElement);

            this.navigationContainerElement = document.createElement("div");
            this.hudElement.append(this.navigationContainerElement);
            this.navigationContainerElement.classList.add("nav");

            {
                const closeBtn = document.createElement("a");
                this.navigationContainerElement.append(closeBtn);
                closeBtn.innerText = "X";

                closeBtn.onclick = async () => {
                    await this.ED3DMap.events.emit("systemSelectionChanged", null);
                };
            }

            this.systemSelectionChanged(null);
        }

        this.ED3DMap.events.on("systemHoverChanged", (system: System | null) => {
            this.systemHoverChanged(system);
        });
        this.ED3DMap.events.on("systemSelectionChanged", (system: System | null) => {
            this.systemSelectionChanged(system);
        });
        this.ED3DMap.events.on("init", () => {
            this.init();
        });
        this.ED3DMap.events.on("render", () => {
            this.render();
        });
    }

    private init(): void {
        const textShapes = this.ED3DMap.font!.generateShapes("System Name", 3);
        const textGeo = new THREE.ShapeGeometry(textShapes);
        this.hoverText = new THREE.Mesh(textGeo, this.ED3DMap.textures.white);
        this.hoverText.visible = false;
        this.ED3DMap.addToScene(this.hoverText);

        this.createFilterList();
    }

    private render(): void {
        if (this.hoverText?.visible) {
            this.hoverText.lookAt(this.ED3DMap.camera.position);
        }
    }

    private systemHoverChanged(system: System | null): void {
        if (system) {
            const textShapes = this.ED3DMap.font!.generateShapes(system?.configuration.name, 3);
            const textGeo = new THREE.ShapeGeometry(textShapes);

            this.hoverText.visible = true;
            this.hoverText.geometry = textGeo;
            this.hoverText.position.set(system.x, system.y + 4, system.z);
            this.hoverText.rotation.y = -Math.PI / 2;
            this.hoverText.lookAt(this.ED3DMap.camera.position);
        }
        else {
            this.hoverText.visible = false;
        }
    }

    private systemSelectionChanged(system: System | null): void {
        this.activeSystem = system;
        if (this.titleElement) {
            if (this.activeSystem) {
                this.titleElement.innerText = this.activeSystem.configuration.name;
                if (this.systemCoordsXElement) {
                    this.systemCoordsXElement.innerText = this.activeSystem.x.toString();
                }
                if (this.systemCoordsYElement) {
                    this.systemCoordsYElement.innerText = this.activeSystem.y.toString();
                }
                if (this.systemCoordsZElement) {
                    this.systemCoordsZElement.innerText = this.activeSystem.z.toString();
                }
                if (this.searchContainerElement) {
                    this.searchContainerElement.hidden = true;
                }
                if (this.filterContainerElement) {
                    this.filterContainerElement.hidden = true;
                }
                if (this.systemInformationElement) {
                    if (this.activeSystem.configuration.description) {
                        this.systemInformationElement.innerHTML = this.activeSystem.configuration.description;
                    }
                    else {
                        this.systemInformationElement.innerText = "";
                    }
                }
                if (this.navigationContainerElement) {
                    this.navigationContainerElement.hidden = false;
                }
            }
            else {
                this.titleElement.innerText = "Infos";
                if (this.searchContainerElement && this.ED3DMap.config.showSystemSearch) {
                    this.searchContainerElement.hidden = false;
                }
                if (this.filterContainerElement) {
                    this.filterContainerElement.hidden = false;
                }
                if (this.navigationContainerElement) {
                    this.navigationContainerElement.hidden = true;
                }
            }
        }
    }

    private createFilterList(): void {
        if (this.filterContainerElement) {
            while (this.filterContainerElement.hasChildNodes()) {
                this.filterContainerElement.removeChild(this.filterContainerElement.firstChild!);
            }
            for (const categoryName of Object.keys(this.ED3DMap.config.categories)) {
                const titleElement = document.createElement("h2");
                this.filterContainerElement.append(titleElement);
                titleElement.innerText = categoryName;
                for (const category of Object.keys(this.ED3DMap.config.categories[categoryName])) {
                    const categoryConfiguration = this.ED3DMap.config.categories[categoryName][category];

                    const filter = document.createElement("a");
                    this.filterContainerElement.append(filter);
                    filter.classList.add("map_filter");

                    if (this.ED3DMap.systemCategories[category]) {
                        filter.onclick = async () => {
                            if (this.ED3DMap.systemCategories[category]) {
                                this.ED3DMap.systemCategories[category].active = !this.ED3DMap.systemCategories[category].active;
                                if (this.ED3DMap.systemCategories[category].active) {
                                    filterCheck.classList.remove("disabled");
                                }
                                else {
                                    filterCheck.classList.add("disabled");
                                }
                                await this.ED3DMap.events.emit("toggleCategoryFilter", category);
                            }
                        };
                    }

                    const filterCheck = document.createElement("span");
                    filter.append(filterCheck);
                    filterCheck.classList.add("check");
                    filterCheck.style.backgroundColor = "#" + categoryConfiguration.color;

                    filter.append(document.createTextNode(categoryConfiguration.name));

                    const systemsCount = this.ED3DMap.config.systems.filter(s => s.categories?.includes(category ?? false)).length;
                    filter.append(document.createTextNode(` (${systemsCount})`));
                }
            }
        }
    }
}