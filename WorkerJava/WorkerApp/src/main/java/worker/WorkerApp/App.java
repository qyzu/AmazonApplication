package worker.WorkerApp;


public class App {
    public static void main(String[] args) {
    	new Thread(new Worker()).start();
    }
}
