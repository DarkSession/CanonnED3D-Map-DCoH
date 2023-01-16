import { ED3DMap } from './ED3DMap';
import { System } from './System';

export class HUD {
    private activeSystem: System | null = null;
    private hudElement: HTMLDivElement | null = null;
    private titleElement: HTMLHeadElement | null = null;
    private distanceToSolElement: HTMLSpanElement | null = null;
    private systemCoordsXElement: HTMLSpanElement | null = null;
    private systemCoordsYElement: HTMLSpanElement | null = null;
    private systemCoordsZElement: HTMLSpanElement | null = null;
    private systemInformationElement: HTMLParagraphElement | null = null;
    private filterContainerElement: HTMLDivElement | null = null;
    private searchContainerElement: HTMLDivElement | null = null;
    private navigationContainerElement: HTMLDivElement | null = null;

    public constructor(
        private readonly ED3DMap: ED3DMap) {
        if (this.ED3DMap.config.withOptionsPanel) {
            const controlsContainer = document.createElement("div");
            this.ED3DMap.appendToContainer(controlsContainer);
            controlsContainer.classList.add("controls");

            /*
            {
                const link1 = document.createElement("div");
                controlsContainer.append(link1);
                link1.innerText = "3D";
                link1.classList.add("selected");
                link1.onmousedown = () => {
                    console.log("link1");
                };
            }
            {
                const link2 = document.createElement("div");
                controlsContainer.append(link2);
                link2.innerText = "2D";
                link2.onmousedown = () => {
                    console.log("link2");
                };
            }
            */
            {
                const link3 = document.createElement("div");
                controlsContainer.append(link3);
                link3.innerText = "i";
                if (this.ED3DMap.config.showGalaxyInfos) {
                    link3.classList.add("selected");
                }
                link3.onmousedown = async () => {
                    this.ED3DMap.config.showGalaxyInfos = !this.ED3DMap.config.showGalaxyInfos;
                    if (this.ED3DMap.config.showGalaxyInfos) {
                        link3.classList.add("selected");
                    }
                    else {
                        link3.classList.remove("selected");
                    }
                    await this.ED3DMap.events.emit("configChanged");
                };
            }
            {
                const link4 = document.createElement("div");
                controlsContainer.append(link4);
                link4.innerHTML = '<img src="images/cog.svg" border="0" style="width: 24px; height: 24px">';
                link4.onmousedown = () => {
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

            distToSolContainer.append(document.createTextNode("Distance to Sol: "));

            this.distanceToSolElement = document.createElement("span");
            distToSolContainer.append(this.distanceToSolElement);
            this.distanceToSolElement.innerText = "-";

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

                const searchInputElement = document.createElement("input");
                this.searchContainerElement.append(searchInputElement);
                searchInputElement.type = "text";
                searchInputElement.oninput = async () => {
                    await this.onSystemSearch(searchInputElement);
                };
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

                closeBtn.onmousedown = async () => {
                    await this.ED3DMap.events.emit("systemSelectionChanged", null);
                };
            }

            this.systemSelectionChanged(null);
        }
        this.ED3DMap.events.on("systemSelectionChanged", (system: System | null) => {
            this.systemSelectionChanged(system);
        });
        this.ED3DMap.events.on("systemsLoaded", () => {
            this.createFilterList();
        });
    }

    private async onSystemSearch(searchInputElement: HTMLInputElement): Promise<void> {
        const systemResult = this.ED3DMap.findSystemByName(searchInputElement.value);
        if (systemResult) {
            this.ED3DMap.setCameraPositionToSystem(systemResult);
            await this.ED3DMap.events.emit("systemSelectionChanged", systemResult);
            searchInputElement.style.outlineColor = "darkgreen";
        } else {
            searchInputElement.style.outlineColor = "red";
        }
    }

    private systemSelectionChanged(system: System | null): void {
        this.activeSystem = system;
        if (this.titleElement) {
            if (this.activeSystem) {
                this.titleElement.innerText = this.activeSystem.configuration.name;
                if (this.systemCoordsXElement) {
                    this.systemCoordsXElement.innerText = (Math.round(this.activeSystem.x * 100) / 100).toString();
                }
                if (this.systemCoordsYElement) {
                    this.systemCoordsYElement.innerText = (Math.round(this.activeSystem.y * 100) / 100).toString();
                }
                if (this.systemCoordsZElement) {
                    this.systemCoordsZElement.innerText = (Math.round(this.activeSystem.z * 100) / 100).toString();
                }
                if (this.distanceToSolElement) {
                    const distance = Math.round(Math.sqrt(this.activeSystem.x * this.activeSystem.x + this.activeSystem.y * this.activeSystem.y + this.activeSystem.z * this.activeSystem.z) * 100) / 100;
                    this.distanceToSolElement.innerText = `${distance} Ly`;
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