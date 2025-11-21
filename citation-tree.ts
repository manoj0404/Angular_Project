import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitationTreeService } from '../../services/citation-tree-service';

// declare all possible globals exposed by your two files
declare global {
  interface Window {
    hprPatSeerTree?: any;
    PatHyprTree?: any;
    hCitationTree?: any;
    angularComponentRef: any;
  }
}

@Component({
  selector: 'app-citation-tree',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './citation-tree.html',
  styleUrls: ['./citation-tree.css']
})
export class CitationTree implements AfterViewInit {
  constructor(private svc: CitationTreeService) {
    window.angularComponentRef = this;
  }
  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    node: null as any
  };
  contextMenuVisible = false;

  tabs: string[] = ['Q'];
  activeTab = 'Q';
  viewBy = 'Current Owner';
  colorBy = 1;
  viewOptions = ['Current Owner', 'Original Assignee', 'Inventor', 'IPC Main', 'Industry'];
  colorOptions = [
    { id: 0, name: 'Default' },
    { id: 1, name: 'Name' },
    { id: 2, name: 'Count' }
  ];
  sliderValue = 0;
  rightSliderOpen = false;

  // slider / selected node
  sliderOpen = false;
  selectedNodeForMenu: any = null;

  // --- internal ---
  private tree: any;
  private treeOptions: any;
  private citationData: any;

  closeContextMenu() {
     this.contextMenu.visible = false;
  }
  readonly baseFont = 14;
  readonly minFontPx = -5;

  get effectiveFontPx(): number {
    const px = this.baseFont + this.sliderValue;
    return px < this.minFontPx ? this.minFontPx : px;
  }

  ngAfterViewInit(): void {
    // verify globals exist (prevents “not a constructor”)
    const Ctor = window.hprPatSeerTree || window.PatHyprTree || window.hCitationTree;
    if (typeof Ctor !== 'function') {
      console.error('PatSeer libs not loaded. Check index.html script tags and /assets path.');
      return;
    }

    // get normalized data from your service
    this.citationData = this.svc.getCitationData(this.viewBy);

    // build PatSeer input JSON (root → Forward/Backward identifier → leaves)
    const inputJSON = this.buildPatseerInput(this.citationData);

    // build treeOptions exactly as the old PatSeer code expects
    this.switchTab(inputJSON.data.tName);
    this.treeOptions = {
      container: 'infovis',
      data: inputJSON,
      rawdata: inputJSON,
      chart: {
        width: 1506,
        height: 628,
        backgroundColor: '#FFF',
        label: { opacity: 1, fontSize: 14 },
        node: { opacity: 0.5 },
        edge: { opacity: 0.25 },
        zoom: { enable: true }
      },
      plotOptions: {
        node: {
          contextMenu: {
            selector: '.ctnCntxtMnu',
            key: 'NodeMenu',
            contexMenuOptions: {
              NodeMenu: [],
              NodeMenuExpand: [],
              NodeMenuRemove: [],
              NodeMenuExpandRemove: [],
              NodeMenuDetails: []
            }
          }
        }
      }
    };

    // construct and draw
    try {
      this.tree = new Ctor(this.treeOptions);
      // your libs expose drawVizGraph() entry point
      if (this.tree.drawVizGraph) {
        this.tree.drawVizGraph();
      } else if (this.tree.drawGraph) {
        this.tree.drawGraph(this.treeOptions.data);
      }
    } catch (e) {
      console.error('Failed to construct PatSeer tree:', e);
    }
  }

  // --- UI handlers ---
  switchTab(tab: string): void {
    this.activeTab = tab;
    const tabMinus = `(g-1)${tab}`;
    const tabPlus = `(g+1)${tab}`;

    this.addGenerationTab(tabMinus);
    this.addGenerationTab(tabPlus);

    this.resetTree();
  }
  toggleRightSlider() {
    this.rightSliderOpen = !this.rightSliderOpen;
  }

  showNodeDetails(node : any){
    debugger;
    console.log("Node Details is click...");
    this.closeContextMenu();
  }
  splitNode(node :any,type : string){
    console.log("Split node is click...");
    this.closeContextMenu();
  }

  expandNode(node:any){
    console.log("Expanded node ...");
    this.closeContextMenu();
  }

  addToProject(node:any){
    console.log("Add to Project ...");
    this.closeContextMenu();
  }
  onViewByChange(): void {
    this.citationData = this.svc.getCitationData(this.viewBy);
    this.resetTree();
  }

  onColorByChange(fld: number): void {
    this.colorBy = fld;
    if (this.tree && typeof this.tree.colorByFld === 'function') {
      this.tree.colorByFld(fld);
    }
  }

  onClkDwnldGrph(type: "image/png" | "image/jpeg"): void {
    if (!this.tree) return;
    this.tree.exportTree(type);
  }

  onFontChange(size: number): void {
    this.sliderValue = size;

    if (this.tree && typeof this.tree.setGrphFont === 'function') {
      this.tree.setGrphFont(size);
    } else {
      // fallback: attempt to update labels if library doesn't provide API
      // comment: this may not work if labels are canvas-drawn by lib
      const px = `${this.effectiveFontPx}px`;
      document.querySelectorAll('#infovis .ht-label').forEach((el: any) => {
        el.style.fontSize = px;
      });
    }
  }

  resetTree(): void {
    if (!this.tree) return;
    // refresh input with possibly new viewBy
    const inputJSON = this.buildPatseerInput(this.citationData);
    this.treeOptions.data = inputJSON;
    this.treeOptions.rawdata = inputJSON;
    this.treeOptions.data.data.tName = this.activeTab;
    this.treeOptions.data.id = this.activeTab;
    this.treeOptions.data.name = this.activeTab;
    if (this.tree.drawVizGraph) {
      this.tree.drawVizGraph();
    } else if (this.tree.drawGraph) {
      this.tree.drawGraph(this.treeOptions.data);
    }

    // do the same initial rotation PatSeer does (Forward, 10°)
    if (this.tree.resetGrpg) this.tree.resetGrpg();
  }

  // Slider helpers
  toggleSlider(): void {
    this.sliderOpen = !this.sliderOpen;
    // If opening and no selected node, keep placeholder or set root
    if (this.sliderOpen && !this.selectedNodeForMenu) {
      // set a default context if you want; here we keep it empty
    }
  }

  openSlider(node?: any): void {
    if (node) {
      this.selectedNodeForMenu = node;
    }
    this.sliderOpen = true;
  }

  // --- helpers ---
  private addGenerationTab(tabName: string): void {
    if (!this.tabs.includes(tabName)) {
      this.tabs.push(tabName);
    }
  }

  private buildPatseerInput(src: any): any {
    const backward = Array.isArray(src?.backward) ? src.backward : [];
    const forward = Array.isArray(src?.forward) ? src.forward : [];

    const NBCT = backward.reduce((sum: number, x: any) => sum + (x?.value ?? 0), 0);
    const NFCT = forward.reduce((sum: number, x: any) => sum + (x?.value ?? 0), 0);

    const fwdNode = {
      id: 'Forward',
      name: 'Forward',
      data: {
        pCitnId: src?.fctId ?? 0,
        tName: 'Forward',
        isparent: false,
        isIdentifier: true,
        isDummy: false,
        RecCnt: 0,
        nodCnt: forward.length,
        tRslt: NFCT
      },
      // leaf children
      children: forward.map((x: any) => ({
        id: `${x.key}_${Math.random()}`,
        name: x.key,
        data: {
          tName: x.key,
          pCitnId: src?.fctId ?? 0,
          NBCT: 0,
          NFCT: 0,
          RecCnt: x.value ?? 0,
          isIdentifier: false
        }
      }))
    };

    const bwdNode = {
      id: 'Backward',
      name: 'Backward',
      parents: null,
      data: {
        pCitnId: src?.bctId ?? 0,
        tName: 'Backward',
        isparent: true,
        isIdentifier: true,
        isDummy: false,
        RecCnt: 0,
        nodCnt: backward.length,
        tRslt: NBCT
      },
      children: backward.map((x: any) => ({
        id: `${x.key}_${Math.random()}`,
        name: x.key,
        data: {
          tName: x.key,
          pCitnId: src?.bctId ?? 0,
          NBCT: 0,
          NFCT: 0,
          RecCnt: x.value ?? 0,
          isIdentifier: false
        }
      }))
    };

    return {
      id: 'Q',
      name: this.activeTab,
      data: { isRoot: true, tName: 'Q' },
      NBCT,
      NFCT,
      NODE_QUERY: '',
      RecCnt: 0,
      isparent: true,
      isIdentifier: true,
      qryStr: 'xxxwww',
      children: [fwdNode, bwdNode],
      parents: null
    };
  }
}
