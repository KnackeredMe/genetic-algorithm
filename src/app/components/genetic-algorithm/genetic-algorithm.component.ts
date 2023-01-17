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
    this.nodes = this.createCities(Number.parseInt(this.optionsForm.value.cities));
    this.createChart(this.nodes);
    this.drawChart();
    this.createPopulation(this.optionsForm.value.individuals)
    for(let i = 0; i < this.optionsForm.value.iterations; i++) {
      this.inbreeding()
    }
    setTimeout(() => this.showBest(), 1000)
  }

  inbreeding() {
    this.population = this.population.sort((firstIndividual, secondIndividual) => firstIndividual.fitness - secondIndividual.fitness);
    const numberOfEliteIndividuals = Math.floor(this.population.length * this.elitismRate);
    const regularIndividuals = this.population.slice(numberOfEliteIndividuals, this.population.length);
    this.shuffleArray(regularIndividuals);
    for (let i = 0; i < regularIndividuals.length; i += 1) {
      if (regularIndividuals[i] && regularIndividuals[i + 1]) {
        regularIndividuals[i] = this.crossover(regularIndividuals[i], regularIndividuals[i + 1]);
        const mutationResult = this.mutation(regularIndividuals[i]);
        regularIndividuals[i] = mutationResult ? mutationResult : regularIndividuals[i];
      }
      if (regularIndividuals[i] && !regularIndividuals[i + 1]) {
        regularIndividuals[i] = this.crossover(regularIndividuals[i], regularIndividuals[i - 1]);
        const mutationResult = this.mutation(regularIndividuals[i]);
        regularIndividuals[i] = mutationResult ? mutationResult : regularIndividuals[i];
      }
    }
    this.population = [...this.population.slice(0, numberOfEliteIndividuals), ...regularIndividuals]
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
    const genes = [];
    let fitness = 0;
    for (let i = 0; i < child.length; i++) {
      if (child[i]) {
        fitness += this.calculateDistance(this.nodes.find(node => node.data.id === child[child.length - 1]), this.nodes.find(node => node.data.id === child[i]));
      }
      if (i === 0) {
        genes.push({ data: { id: `${child[child.length - 1]}-${child[i]}`, source: `${child[child.length - 1]}`, target: `${child[i]}` }});
        continue;
      }
      genes.push({ data: { id: `${child[i - 1]}-${child[i]}`, source: `${child[i - 1]}`, target: `${child[i]}` }});
    }
    return {genes: genes, fitness: fitness};
  }

  mutation(individual) {
    if (Math.random() > this.optionsForm.value.mutationRate || !individual) return;
    const randomIndividual = individual;
    const randomGeneIndexFirst = Math.floor(Math.random() * randomIndividual.genes.length);
    const randomGeneFirstTarget = randomIndividual.genes[randomGeneIndexFirst].data.target;
    const randomGeneFirstSource = randomIndividual.genes[randomGeneIndexFirst].data.source;
    const randomGeneIndexSecond = Math.floor(Math.random() * randomIndividual.genes.length);
    const randomGeneSecondTarget = randomIndividual.genes[randomGeneIndexSecond].data.target;
    const randomGeneSecondSource = randomIndividual.genes[randomGeneIndexSecond].data.source;
    const firstEdgeId = `#${randomIndividual.genes[randomGeneIndexFirst].data.source}-${randomIndividual.genes[randomGeneIndexFirst].data.target}`
    const secondEdgeId = `#${randomIndividual.genes[randomGeneIndexSecond].data.source}-${randomIndividual.genes[randomGeneIndexSecond].data.target}`
    this.cy.remove(firstEdgeId);
    this.cy.remove(secondEdgeId);
    randomIndividual.genes[randomGeneIndexFirst].data.target = JSON.parse(JSON.stringify(randomGeneSecondTarget));
    randomIndividual.genes[randomGeneIndexFirst].data.source = JSON.parse(JSON.stringify(randomGeneSecondSource));
    randomIndividual.genes[randomGeneIndexFirst].data.id = `${randomIndividual.genes[randomGeneIndexFirst].data.source}-${randomIndividual.genes[randomGeneIndexFirst].data.target}`
    randomIndividual.genes[randomGeneIndexSecond].data.target = JSON.parse(JSON.stringify(randomGeneFirstTarget));
    randomIndividual.genes[randomGeneIndexSecond].data.source = JSON.parse(JSON.stringify(randomGeneFirstSource));
    randomIndividual.genes[randomGeneIndexSecond].data.id = `${randomIndividual.genes[randomGeneIndexSecond].data.source}-${randomIndividual.genes[randomGeneIndexSecond].data.target}`
    this.addEdge(randomIndividual.genes[randomGeneIndexFirst], this.generateHex());
    this.addEdge(randomIndividual.genes[randomGeneIndexSecond], this.generateHex());
    randomIndividual.fitness = 0
    randomIndividual.genes.forEach(gene => {
      randomIndividual.fitness += this.calculateDistance(this.nodes.find(node => node.data.id === gene.data.source), this.nodes.find(node => node.data.id === gene.data.target));
    })
    return randomIndividual;
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
    console.log(this.population[0]);
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
          'width': 4,
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
