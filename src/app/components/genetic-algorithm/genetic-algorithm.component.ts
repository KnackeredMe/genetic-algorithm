import {Component, OnInit} from '@angular/core';
import * as cytoscape from 'cytoscape';
import {FormBuilder, FormControl, FormGroup} from "@angular/forms";

@Component({
  selector: 'app-genetic-algorithm',
  templateUrl: './genetic-algorithm.component.html',
  styleUrls: ['./genetic-algorithm.component.css']
})
export class GeneticAlgorithmComponent implements OnInit{
  private cy;
  private nodes;
  private population = [];
  private elitismRate = 0.5;
  private history = [];
  public citiesControl: FormControl = new FormControl<number>(10);
  public individualsControl: FormControl = new FormControl<number>(10);
  public iterationsControl: FormControl = new FormControl<number>(10);
  public mutationControl: FormControl = new FormControl<number>(0.1);
  public optionsForm: FormGroup;

  constructor(public fb: FormBuilder) {
  }

  ngOnInit() {
    this.optionsForm = this.fb.group({
      cities: this.citiesControl,
      individuals: this.individualsControl,
      iterations: this.iterationsControl,
      mutationRate: this.mutationControl
    })
  }

  run() {
    this.cy = null;
    this.nodes = null;
    this.population = [];
    this.history = [];
    this.nodes = this.createCities(Number.parseInt(this.optionsForm.value.cities));
    this.createChart(this.nodes);
    this.drawChart();
    this.createPopulation(this.optionsForm.value.individuals)
    for(let i = 0; i < this.optionsForm.value.iterations; i++) {
      this.inbreeding();
    }
    setTimeout(() => this.showBest(), 1000);
  }

  inbreeding() {
    this.population = this.population.sort((firstIndividual, secondIndividual) => firstIndividual.fitness - secondIndividual.fitness);
    this.history.push(JSON.parse(JSON.stringify(this.population[0])));
    const numberOfEliteIndividuals = Math.floor(this.population.length * this.elitismRate);
    const eliteIndividuals = JSON.parse(JSON.stringify(this.population.slice(0, numberOfEliteIndividuals)));
    this.shuffleArray(eliteIndividuals);
    for (let i = 0; i < eliteIndividuals.length; i += 1) {
      if (eliteIndividuals[i] && eliteIndividuals[i + 1]) {
        eliteIndividuals[i] = this.crossover(eliteIndividuals[i], eliteIndividuals[i + 1]);
        const mutationResult = this.mutation(eliteIndividuals[i]);
        eliteIndividuals[i] = mutationResult ? mutationResult : eliteIndividuals[i];
      }
      if (eliteIndividuals[i] && !eliteIndividuals[i + 1]) {
        eliteIndividuals[i] = this.crossover(eliteIndividuals[i], eliteIndividuals[i - 1]);
        const mutationResult = this.mutation(eliteIndividuals[i]);
        eliteIndividuals[i] = mutationResult ? mutationResult : eliteIndividuals[i];
      }
    }
    this.population = [...this.population.slice(0, numberOfEliteIndividuals), ...eliteIndividuals];
  }

  crossover(firstParent, secondParent) {
    if (!firstParent || !secondParent) return null;
    const numericFormFirst = firstParent.genes.map(el => el.data.target);
    const numericFormSecond = secondParent.genes.map(el => el.data.target);
    const len = numericFormFirst.length;
    const crossoverPoint = Math.floor(Math.random() * len);
    const subTour1 = numericFormFirst.slice(crossoverPoint, len);
    const child = new Array(len);
    for (let i = 0; i < len; i++) {
      child[i] = null;
    }
    for (let i = 0; i < subTour1.length; i++) {
      child[i + crossoverPoint] = subTour1[i];
    }
    for (let i = 0; i < len; i++) {
      if (!child.includes(numericFormSecond[i])) {
        for (let j = 0; j < len; j++) {
          if (child[j] === null) {
            child[j] = numericFormSecond[i];
            break;
          }
        }
      }
    }
    return this.convertToGraphRepresentation(child);
  }

  mutation(individual) {
    const numericForm = individual.genes.map(el => el.data.target);
    for (let i = 0; i < numericForm.length; i++) {
      let rand = Math.random();
      if (rand < Number.parseFloat(this.optionsForm.value.mutationRate)) {
        let swapIndex = Math.floor(Math.random() * numericForm.length);
        let temp = numericForm[i];
        numericForm[i] = numericForm[swapIndex];
        numericForm[swapIndex] = temp;
      } else {
        return null;
      }
    }
    return this.convertToGraphRepresentation(numericForm);
  }

  convertToGraphRepresentation(numericForm) {
    const genes = [];
    let fitness = 0;
    for (let i = 0; i < numericForm.length; i++) {
      if (numericForm[i]) {
        fitness += this.calculateDistance(this.nodes.find(node => node.data.id === numericForm[numericForm.length - 1]), this.nodes.find(node => node.data.id === numericForm[i]));
      }
      if (i === 0) {
        genes.push({ data: { id: `${numericForm[numericForm.length - 1]}-${numericForm[i]}`, source: `${numericForm[numericForm.length - 1]}`, target: `${numericForm[i]}` }});
        continue;
      }
      genes.push({ data: { id: `${numericForm[i - 1]}-${numericForm[i]}`, source: `${numericForm[i - 1]}`, target: `${numericForm[i]}` }});
    }
    return {genes: genes, fitness: fitness};
  }


  createPopulation(numberOfIndividuals) {
    for(let i = 0; i < numberOfIndividuals; i++) {
      const individual = this.createIndividual();
      const color = this.generateHex();
      individual.genes.forEach(edge => {
        this.addEdge(edge, color);
      })
      this.population.push(individual);
    }
  }

  createCities(numberOfCities: number) {
    const cities = [];
    for(let i = 0; i < numberOfCities; i++) {
      cities.push({ data: { id: i }, position: {x: this.generateRandom(), y: this.generateRandom()}});
    }
    return cities;
  }

  createIndividual() {
    const individual = {genes: [], fitness: 0};
    const nodesCopy = JSON.parse(JSON.stringify(this.nodes));
    let initialId = Math.floor(Math.random() * nodesCopy.length);
    let startId= initialId;
    nodesCopy[initialId].start = true;
    for(let i = 0; i < this.nodes.length; i++) {
      if (i === this.nodes.length - 1) {
        individual.genes.push({ data: { id: `${startId}-${initialId}`, source: `${startId}`, target: `${initialId}` }})
        break;
      }
      const freeNodes = nodesCopy.filter(node => !node.connected && !node.start);
      const finishIndex = Math.floor(Math.random() * freeNodes.length);
      const finishId = freeNodes[finishIndex].data.id;
      individual.genes.push({ data: { id: `${startId}-${finishId}`, source: `${startId}`, target: `${finishId}`}});
      individual.fitness += this.calculateDistance(freeNodes[finishIndex], nodesCopy.find(node => node.data.id === startId.toString()))
      nodesCopy.find(node => node.data.id === finishId).connected = true;
      startId = finishId;
    }
    return individual;
  }

  calculateDistance(firstNode, secondNode) {
    if (!firstNode || !secondNode) return 0;
    return Math.sqrt(Math.pow(firstNode.position.x - secondNode.position.x, 2) + Math.pow(firstNode.position.y - secondNode.position.y, 2))
  }

  generateRandom() {
    return Math.floor(Math.random() * 1000);
  }

  drawChart() {
    this.cy.elements().bfs('#a', () => {}, true);
    this.cy.nodes().ungrabify();
  }

  addEdge(edge, color) {
    this.cy.add([{ group: 'edges', data: edge.data, style:
        {'background-color': color,
          'line-color': color,
          'target-arrow-color': color,
          'transition-property': 'background-color, line-color, target-arrow-color',
          'transition-duration': '0.05s'}}]);
  }

  showBest() {
    this.population = this.population.sort((firstIndividual, secondIndividual) => firstIndividual.fitness - secondIndividual.fitness);
    console.log(this.history);
    let i = 0;
    const highlightNextEle = () => {
      if (i < this.population[0].genes.length) {
        this.cy.$(`#${this.population[0].genes[i].data.id}`).addClass('highlighted');
        i++;
        setTimeout(highlightNextEle, 100);
      }
    };
    highlightNextEle();
  }

  generateHex() {
    return '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  createChart(nodes) {
    const nodeColor = this.generateHex()
    const edgeColor = this.generateHex();
    this.cy = cytoscape({
      container: document.getElementById('graph'),
      elements: {nodes: nodes},
      layout: {
        name: 'preset',
        directed: true,
        roots: '#a',
        padding: 10
      },
      style: cytoscape.stylesheet()
        .selector('node')
        .style({
          'content': 'data(id)',
          'background-color': nodeColor,
        })
        .selector('edge')
        .style({
          'curve-style': 'bezier',
          'target-arrow-shape': 'triangle',
          'width': 2,
          'line-color': edgeColor,
          'target-arrow-color': edgeColor
        })
        .selector('.highlighted')
        .style({
          'width': 8,
          'background-color': 'red',
          'line-color': 'red',
          'target-arrow-color': 'red',
          'transition-property': 'background-color, line-color, target-arrow-color',
          'transition-duration': '0.05s',
        }),
    });
  }
}
