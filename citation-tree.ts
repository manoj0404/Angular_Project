import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitationTreeService } from '../../services/citation-tree-service';
declare var $jit: any;

interface TreeNode {
  id: string;
  name: string;
  data?: any;
  children: TreeNode[];
}

@Component({
  selector: 'app-citation-tree',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './citation-tree.html',
  styleUrls: ['./citation-tree.css']
})
export class CitationTree implements AfterViewInit {
  constructor(private citationService: CitationTreeService) {}

  private ht: any;
  selectedNode: any = null;
  sliderValue: number = 0;
  readonly baseFont = 14;
  readonly minFontPx = -5;

  /**  Dynamic Tabs */
  tabs: string[] = ['Q', '(g-1)Q', '(g+1)Q'];
  activeTab: string = 'Q';

  viewBy: string = 'Current Owner';
  colorBy: string = 'Name';

  viewOptions = ['Current Owner', 'Original Assignee', 'Inventor', 'IPC Main', 'Industry'];
  colorOptions = ['Default', 'Name', 'Count'];

  private citationData: any = {};
  private colorSeq: string[] = [];
  private colorPalette = [
    '#3366cc', '#dc3912', '#ff9900', '#109618', '#990099',
    '#dd4477', '#66aa00', '#b82e2e', '#316395', '#994499',
    '#22aa99', '#aaaa11', '#6633cc', '#e67300', '#8b0707'
  ];

  ngAfterViewInit(): void {
    debugger;
    if (typeof $jit === 'undefined') {
      console.error('JIT library not loaded.');
      return;
    }
    this.citationData = this.citationService.getCitationData();
    this.initializeTree();
  }

  /**  Font size getter */
  get effectiveFontPx(): number {
    const px = this.baseFont + this.sliderValue;
    return px < this.minFontPx ? this.minFontPx : px;
  }

  /**  Font size slider handler */
  onFontSizeChange(event: Event): void {
    const t = event.target as HTMLInputElement;
    this.sliderValue = Number(t.value);
    this.updateLabelFontSize();
  }

  
  switchTab(tab: string): void {   // switch tabs
    debugger;
    this.activeTab = tab;
    // console.log(`Switched to tab: ${tab}`);

    
    const backward = `(g-1)${tab}`;
    const forward = `(g+1)${tab}`;

    const newTabs = [backward, forward];

    // Prevent duplicates and append new ones
    newTabs.forEach(nt => {
      if (!this.tabs.includes(nt)) {
        this.tabs.push(nt);
      }
    });

    // (Optional) keep only last 20 tabs
    //if (this.tabs.length > 20) this.tabs.splice(0, this.tabs.length - 20);

    // Simulate load data for this tab
    this.loadGenerationData(tab);
  }

  onViewByChange(): void {
    debugger;
    this.citationData = this.citationService.getCitationData(this.viewBy);
    this.resetTree();
  }

  onColorByChange(): void {
    debugger;
    //console.log('Color By changed:', this.colorBy);
    this.colorSeq = [];
    this.resetTree();
  }

  /**  Update label font size dynamically */
  private updateLabelFontSize(): void {
    const size = `${this.effectiveFontPx}px`;
    const labels = document.querySelectorAll('#infovis .ht-label');
    labels.forEach(lbl => ((lbl as HTMLElement).style.fontSize = size));
  }

  /**  Initialize HyperTree */
  private initializeTree(): void {
    const data = this.createCitationTree(this.citationData);

    this.ht = new $jit.Hypertree({
      injectInto: 'infovis',
      width: 1500,
      height: 600,
      Navigation: { enable: true, panning: true, zooming: 30 },
      Node: { type:'circle', dim: 15, overridable: true},
      Edge: { lineWidth: 1.2, color: this.hexToRGB('#2b8cbe', 0.7) },
      offset: 0.2,
      orientation: 'left',

      onBeforePlotNode: (node: any) => {
        node.data.$color = this.getColorByInput(node);
      },

      onCreateLabel: (domElement: HTMLElement, node: any) => {
        //domElement.style.fontFamily = 'sans-serif';
        domElement.classList.add('ht-label');
        domElement.innerHTML = node.name;
        domElement.style.cursor = 'pointer';
        domElement.style.fontWeight = 'bold';
        domElement.style.color = node.data?.$color || '#222';
        domElement.style.whiteSpace = 'nowrap';
        domElement.style.fontSize = `${this.effectiveFontPx}px`;

        if (['root', 'backward', 'forward'].includes(node.id)) {
          domElement.style.transform = 'translate(-50%, -50%)';
          domElement.style.color = '#fff'; 
          }
  
        domElement.onclick = () => {
          this.ht.onClick(node.id);
          this.selectedNode = {
            name: node.name,
            type: node.id.startsWith('b')
              ? 'Backward'
              : node.id.startsWith('f')
              ? 'Forward'
              : node.id === 'root'
              ? 'Main Patent'
              : 'Citation'
          };
        };
      },

      onPlaceLabel: (domElement: HTMLElement, node: any) => {
        const style = domElement.style;
        const left = parseInt(style.left);
        const w = domElement.offsetWidth;
        if (node.id.startsWith('b')) {
          style.textAlign = 'right';
          style.left = `${left - w - 8}px`;
        } else if (node.id.startsWith('f')) {
          style.textAlign = 'left';
          style.left = `${left + 8}px`;
        } else {
          style.textAlign = 'center';
        }
        style.display = '';
      }
    });

    this.ht.loadJSON(data);
    this.ht.refresh();

    setTimeout(() => {
      this.updateLabelFontSize();
      this.rotateGraph('root', 90);
      this.ht.onClick('root');
    }, 0);
  }

  /**  Reset the tree */
  resetTree(): void {
    this.selectedNode = null;
    if (!this.ht) return;
    this.ht.loadJSON(this.createCitationTree(this.citationData));
    this.ht.refresh();
    setTimeout(() => {
      this.updateLabelFontSize();
      this.rotateGraph('root', 90);
      this.ht.onClick('root');
    }, 120);
  }

  /**  Rotate the graph horizontally */
  private rotateGraph(nodeId: string, thetaDeg: number): void {
    if (!this.ht) return;
    const node = this.ht.graph.getNode(nodeId);
    if (!node) return;

    const theta = (thetaDeg * Math.PI) / 180;
    this.ht.graph.eachNode((n: any) => {
      const p = n.getPos('current');
      p.theta += theta;
      if (p.theta < 0) p.theta += Math.PI * 2;
    });
    this.ht.fx.plot();
  }

  /**  Build tree data */
  private createCitationTree(citationData: any): TreeNode {
    const root: TreeNode = {
      id: 'root',
      name: this.activeTab,
      children: []
    };

    const backwardNode: TreeNode = {
      id: 'backward',
      name: 'B',
      children: citationData.backward.map((item: any, i: number) => ({
        id: `b${i}`,
        name: `${item.key} (${item.value})`,
        data: { tName: item.key, RecCnt: item.value },
        children: []
      }))
    };

    const forwardNode: TreeNode = {
      id: 'forward',
      name: 'F',
      children: citationData.forward.map((item: any, i: number) => ({
        id: `f${i}`,
        name: `${item.key} (${item.value})`,
        data: { tName: item.key, RecCnt: item.value },
        children: []
      }))
    };

    root.children.push(backwardNode, forwardNode);
    return root;
  }

  /**  Color logic */
  private getColorByInput(node: any): string {
    if (node.id === 'root') return '#000';
    if (this.colorBy === 'Default') {
      return node.id.startsWith('b') ? '#8c510a' : '#2b8cbe';
    } else if (this.colorBy === 'Name') {
      return this.getColorFromSeq(node.data.tName);
    } else if (this.colorBy === 'Count') {
      return this.getColorFromSeq(node.data.RecCnt);
    }
    return '#ccc';
  }

  private getColorFromSeq(value: any): string {
    const key = String(value).toLowerCase();
    if (!this.colorSeq.includes(key)) this.colorSeq.push(key);
    return this.colorPalette[this.colorSeq.indexOf(key) % this.colorPalette.length];
  }

  private hexToRGB(hex: string, alpha?: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return alpha !== undefined
      ? `rgba(${r}, ${g}, ${b}, ${alpha})`
      : `rgb(${r}, ${g}, ${b})`;
  }

  private loadGenerationData(tab: string): void {
    debugger;
    this.citationData = this.citationService.getCitationData();
    this.resetTree();
  }
}
