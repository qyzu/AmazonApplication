package worker.WorkerApp;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;

import com.amazonaws.auth.AWSCredentials;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.regions.Region;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.simpledb.AmazonSimpleDBAsync;
import com.amazonaws.services.simpledb.AmazonSimpleDBAsyncClient;
import com.amazonaws.services.simpledb.model.CreateDomainRequest;
import com.amazonaws.services.simpledb.model.GetAttributesRequest;
import com.amazonaws.services.simpledb.model.GetAttributesResult;
import com.amazonaws.services.simpledb.model.PutAttributesRequest;
import com.amazonaws.services.simpledb.model.PutAttributesResult;
import com.amazonaws.services.simpledb.model.ReplaceableAttribute;
import com.amazonaws.services.sqs.AmazonSQSAsync;
import com.amazonaws.services.sqs.AmazonSQSAsyncClient;
import com.amazonaws.services.sqs.model.DeleteMessageRequest;
import com.amazonaws.services.sqs.model.DeleteMessageResult;
import com.amazonaws.services.sqs.model.Message;
import com.amazonaws.services.sqs.model.ReceiveMessageRequest;
import com.amazonaws.util.IOUtils;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

/*
	Worker (moze byc w Java) jest oddzielna aplikacja uruchamianą na oddzielnej instancji Amazona.
	1. Sprawdza czy w sqs sa jakies messages z informacjami o plikach w kolejce do zmodyfikowania.
	2. Jezeli są to je pobiera z S3 na podstawie informacji z kolejki.
	3. Oraz modyfikuje je (np. zmienia rozmiar)
	4. Następnie wysyla zmodyfikwoane pliki z powrotem do S3
	5. Na koniec wysyla logi do dsimpleDB analogiczne do wysylanych plikow wczesniej, ale moze jeszcze z info ze zostal zmodyfikowany.
 */
public class Worker implements Runnable {
    private final String sqsQueueUrl = "https://sqs.us-west-2.amazonaws.com/983680736795/klysSQS";
    private AmazonS3 s3;
    private AmazonSQSAsync sqs;
    private AmazonSimpleDBAsync sdb;
    private Config config;
    private String domainName;
    
    
    private void initConfig() throws FileNotFoundException, IOException {
    	FileInputStream fis = new FileInputStream(new File("../../config.json"));
    	byte[] bytes = new byte[512];
    	fis.read(bytes);
    	String jsonString = new String(bytes).trim();
		Gson gson = new GsonBuilder().create();
		config = gson.fromJson(jsonString, Config.class);
		fis.close();
    }
    
	Worker() {
		try {
			initConfig();
		} catch(Exception e) {
			e.printStackTrace();
		}
		
        AWSCredentials awsCredentials = new BasicAWSCredentials(config.getAccessKeyId(), config.getSecretAccessKey());
        Region awsRegion = Region.getRegion(Regions.fromName(config.getRegion()));   
    
        sqs = new AmazonSQSAsyncClient(awsCredentials);
        sqs.setRegion(awsRegion);

        s3 = new AmazonS3Client(awsCredentials);
        sqs.setRegion(awsRegion);

		domainName = "klysSimpleDB";
        sdb = new AmazonSimpleDBAsyncClient(awsCredentials);
        sdb.setRegion(awsRegion);
		//sdb.createDomain(new CreateDomainRequest(domainName));
	}
	
	public static void main(String[] args) {
		new Thread(new Worker()).start();
	}
	
	private Message receiveMessage() {		
		 ReceiveMessageRequest receiveMessageRequest = new ReceiveMessageRequest(sqsQueueUrl);
         List<Message> messages = sqs.receiveMessage(receiveMessageRequest).getMessages();
         /*for (Message message : messages) {
             System.out.println("  Message");
             System.out.println("    MessageId:     " + message.getMessageId());
             System.out.println("    ReceiptHandle: " + message.getReceiptHandle());
             System.out.println("    MD5OfBody:     " + message.getMD5OfBody());
             System.out.println("    Body:          " + message.getBody());
             for (Entry<String, String> entry : message.getAttributes().entrySet()) {
                 System.out.println("  Attribute");
                 System.out.println("    Name:  " + entry.getKey());
                 System.out.println("    Value: " + entry.getValue());
             }
         }*/
         
         if(messages.isEmpty()) {
        	 return null;
         } else {
             System.out.println();
        	 return messages.get(0);
         }
	}
	
	private void deleteMessage(Message message) {
		String messageReceiptHandle = message.getReceiptHandle();
		DeleteMessageResult result = sqs.deleteMessage(new DeleteMessageRequest()
									    .withQueueUrl(sqsQueueUrl)
									    .withReceiptHandle(messageReceiptHandle));
		System.out.println(result);
	}
	
	private File getFileFromS3(Message message) {
		try {
			String[] parameters = message.getBody().split(";");
			S3Object object = s3.getObject(new GetObjectRequest(parameters[0], parameters[1]));
			InputStream inputStream = object.getObjectContent();
			
			File file = File.createTempFile("image", ".png");
			file.deleteOnExit();
	        try (FileOutputStream out = new FileOutputStream(file)) {
	            IOUtils.copy(inputStream, out);
	        }
	        inputStream.close();
	        return file;
		} catch (IOException e) {
			e.printStackTrace();
			return null;
		}
	}
	
	private Image resizeImageFromFile(File file, String body) {
		try {
			Image image = ImageIO.read(file);
			image = image.getScaledInstance(image.getWidth(null)/2, image.getHeight(null)/2, Image.SCALE_DEFAULT);
			System.out.println(body + " : File resized successfully!");			
			return image;
		} catch (IOException e) {
			//e.printStackTrace();
			return null;
		}
	}
	
	private void putImageFileToS3(Image image, Message message) {
	    try {
			File imageFile = new File("imageFile.png");
			BufferedImage bufferedImage = new BufferedImage(image.getWidth(null), image.getHeight(null), BufferedImage.TYPE_INT_ARGB);
		    Graphics2D g2d = bufferedImage.createGraphics();
		    g2d.drawImage(image, 0, 0, null);
		    g2d.dispose();
			ImageIO.write(bufferedImage, "png", imageFile);
			
			String[] parameters = message.getBody().split(";");
			if(parameters.length == 2) {
				s3.putObject(new PutObjectRequest(parameters[0], parameters[1], imageFile));
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	private void sendLogsToSimpleDB(Message message) {		
		String log = message.getBody() + " has been resized.";
		
		List<ReplaceableAttribute> attributes = new ArrayList<>();
		String[] parameters = message.getBody().split(";");
		attributes.add(new ReplaceableAttribute("bucket", parameters[0], false));
		attributes.add(new ReplaceableAttribute("key", parameters[1], false));		
		
		sdb.putAttributes(new PutAttributesRequest(domainName, log, attributes));
		GetAttributesResult result = sdb.getAttributes(new GetAttributesRequest(domainName, log));
		System.out.println(result);
	}
	
	public void run() {		
		while(true) {
			//Sprawdza czy w sqs sa jakies messages z informacjami o plikach w kolejce do zmodyfikowania:
			final Message message = receiveMessage();			
			if(message != null) {
				//Jeżeli są to usuwa message z kolejki:
				deleteMessage(message);	
				
				//Pobiera pliki z S3 na podstawie informacji z kolejki:
				final File fileFromS3 = getFileFromS3(message);
				
				new Thread(new Runnable() {
					@Override
					public void run() {			
						//Oraz pobiera pliki z S3 na podstawie informacji z kolejki oraz modyfikuje je (zmienia rozmiar):
						Image resizedImage = resizeImageFromFile(fileFromS3, message.getBody());
						if(resizedImage != null) {
							//Następnie wysyla zmodyfikwoane pliki z powrotem do S3:
							putImageFileToS3(resizedImage, message);
							//Wysłanie logów do simpleDB z informacją, że plik został zmodyfikowany:
							sendLogsToSimpleDB(message);
						}
					}					
				}).start();
			}			
		}
	}	
}

